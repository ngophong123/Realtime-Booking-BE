const bookingRepository = require("../repositories/booking.repository");
const showtimeRepository = require("../repositories/showtime.repository");
const seatHoldRepository = require("../repositories/seathold.repository");
const roomRepository = require("../repositories/room.repository");
const voucherService = require("../services/voucher.service");
const notificationService = require("../services/notification.service");
const emailService = require("../services/email.service");
const prisma = require("../config/prisma");
const { acquireLock, releaseLock } = require("../utils/redisLock");
const crypto = require("crypto");

// 4. STATE MACHINE RULES CHO ĐƠN HÀNG
const ALLOWED_TRANSITIONS = {
  PENDING: ['HOLDING', 'CANCELLED', 'EXPIRED'],
  HOLDING: ['PAID', 'EXPIRED', 'CANCELLED'],
  PAID: ['CONFIRMED', 'REFUNDED'],
  CONFIRMED: ['REFUNDED'],
  CANCELLED: [],
  EXPIRED: [],
  FAILED: [],
  REFUNDED: [],
};

function isValidStateTransition(fromState, toState) {
  if (fromState === toState) return true; // idempotent
  const allowed = ALLOWED_TRANSITIONS[fromState] || [];
  return allowed.includes(toState);
}

class BookingService {
    async createBooking(userId, showtimeId, seatIds, voucherCode, paymentMethod, idempotencyKey, user, reqMeta = {}) {
        if (!showtimeId || !Array.isArray(seatIds) || seatIds.length === 0) {
            throw new Error('Vui lòng chọn suất chiếu và danh sách ghế hợp lệ!');
        }

        // 2. IDEMPOTENCY CHECK: Nếu request cùng key đã tạo đơn thành công, trả lại kết quả cũ
        if (idempotencyKey) {
            const existing = await bookingRepository.findByIdempotencyKey(idempotencyKey);
            if (existing) {
                console.log(`⚡ [IDEMPOTENCY] Trả lại đơn đặt vé cũ cho key: ${idempotencyKey}`);
                const seatLabels = existing.bookingSeats?.map((s) => s.seat?.label || s.seatId);
                return {
                    ...existing,
                    seatLabels,
                };
            }
        }

        // 1. REDIS DISTRIBUTED LOCK TRÁNH BÁN TRÙNG GHẾ (RACE CONDITION)
        const acquiredLocks = [];
        try {
            for (const seatId of seatIds) {
                const lockKey = `lock:booking:${showtimeId}:${seatId}`;
                const lockVal = await acquireLock(lockKey, 5000);
                if (!lockVal) {
                    throw new Error('Một hoặc nhiều ghế bạn chọn đang được giao dịch bởi khách hàng khác. Vui lòng thử lại sau giây lát!');
                }
                acquiredLocks.push({ key: lockKey, val: lockVal });
            }

            const showtime = await showtimeRepository.findById(showtimeId);
            if (!showtime) {
                throw new Error('Không tìm thấy suất chiếu yêu cầu!');
            }

            const seats = await roomRepository.findSeatsByIds(seatIds);
            if (seats.length !== seatIds.length) {
                throw new Error('Có ghế không tồn tại trong hệ thống!');
            }

            const invalidSeat = seats.find((seat) => seat.roomId !== showtime.roomId);
            if (invalidSeat) {
                throw new Error(`Ghế ${invalidSeat.label} không thuộc phòng chiếu của suất chiếu này!`);
            }

            const bookedSeat = await bookingRepository.findBookedSeatsForShowtime(showtimeId, seatIds);
            if (bookedSeat) {
                throw new Error(`Rất tiếc! Ghế ${bookedSeat.seat.label} vừa được khách hàng khác đặt mua. Vui lòng chọn ghế khác!`);
            }

            const activeHold = await seatHoldRepository.findActiveHoldsByOthers(showtimeId, seatIds, userId);
            if (activeHold) {
                throw new Error(`Rất tiếc! Ghế ${activeHold.seat.label} đang được khách hàng khác giữ chỗ. Vui lòng chọn ghế khác!`);
            }

            let subTotal = 0;
            const basePrice = parseFloat(showtime.price);

            const seatsData = seats.map((seat) => {
                let finalPrice = basePrice;
                switch (seat.type) {
                    case 'VIP':
                        finalPrice += 20000;
                        break;
                    case 'COUPLE':
                        finalPrice += 40000;
                        break;
                    default:
                        break;
                }

                subTotal += finalPrice;

                return {
                    seatId: seat.id,
                    price: finalPrice,
                };
            });

            let discountAmount = 0;
            if (voucherCode && voucherCode.trim() !== '') {
                const voucherResult = await voucherService.validateAndApply(voucherCode.trim(), subTotal, userId);
                discountAmount = voucherResult.discountAmount;
            }

            const finalTotalPrice = Math.max(0, subTotal - discountAmount);

            // 7. SINH CHỮ KÝ SỐ / TOKEN DÙNG MỘT LẦN CHO VÉ ĐIỆN TỬ
            const secret = process.env.JWT_SECRET || 'cineverse_secret_2026';
            const rawTokenData = `${userId}:${showtimeId}:${Date.now()}:${crypto.randomBytes(8).toString('hex')}`;
            const ticketToken = crypto.createHmac('sha256', secret).update(rawTokenData).digest('hex');

            // Tạo đơn hàng trạng thái CONFIRMED (hoặc PAID theo cổng thanh toán)
            const bookingResult = await bookingRepository.createBooking(
                userId,
                showtimeId,
                seatsData,
                finalTotalPrice,
                discountAmount,
                voucherCode ? voucherCode.trim() : null,
                paymentMethod || 'MOMO',
                idempotencyKey || null,
                ticketToken,
                'CONFIRMED'
            );

            await seatHoldRepository.deleteHolds(userId, showtimeId, seatIds);

            // 6. GHI LOG GIAO DỊCH (AUDIT TRAIL)
            await prisma.paymentLog.create({
                data: {
                    bookingId: bookingResult.id,
                    userId,
                    orderId: bookingResult.id,
                    amount: finalTotalPrice,
                    paymentMethod: paymentMethod || 'MOMO',
                    statusBefore: 'PENDING',
                    statusAfter: 'CONFIRMED',
                    ipAddress: reqMeta.ip || '127.0.0.1',
                    userAgent: reqMeta.userAgent || 'Web Client',
                    isVerified: true,
                    checksum: crypto.createHash('md5').update(`${bookingResult.id}:${finalTotalPrice}:CONFIRMED`).digest('hex'),
                },
            }).catch((err) => console.error('Lỗi ghi audit payment log:', err.message));

            const seatLabels = seats.map((s) => s.label);

            // 1. Tạo Notification cho Admin & User
            notificationService.createNotification({
                userId: null,
                title: '🔔 ĐƠN ĐẶT VÉ MỚI!',
                message: `${user.name || 'Khách'} vừa đặt ${seatIds.length} vé phim "${showtime.movie?.title}" (${seatLabels.join(', ')}). Tổng: ${finalTotalPrice.toLocaleString('vi-VN')}đ`,
                type: 'BOOKING',
            }).catch((err) => console.error('Lỗi tạo notif admin:', err.message));

            notificationService.createNotification({
                userId: userId,
                title: '⏳ ĐƠN VÉ ĐANG CHỜ DUYỆT',
                message: `Bạn vừa đặt vé xem phim "${showtime.movie?.title}". Vui lòng chờ quản trị viên xác nhận!`,
                type: 'BOOKING',
            }).catch((err) => console.error('Lỗi tạo notif user:', err.message));

            // 2. Gửi Email thông báo Admin
            emailService.sendAdminBookingAlert({
                bookingId: bookingResult.id,
                userName: user.name || 'Khách hàng',
                userEmail: user.email,
                movieTitle: showtime.movie?.title,
                roomName: showtime.room?.name,
                startTime: showtime.startTime,
                seatLabels,
                totalPrice: finalTotalPrice,
                paymentMethod,
            }).catch((err) => console.error('Lỗi gửi email admin:', err.message));

            return {
                ...bookingResult,
                showtime,
                seatsData,
                seatLabels,
            };
        } finally {
            // Release all acquired Redis locks
            for (const lock of acquiredLocks) {
                await releaseLock(lock.key, lock.val);
            }
        }
    }

    async approveBooking(bookingId) {
        const booking = await bookingRepository.findById(bookingId);
        if (!booking) {
            throw new Error('Không tìm thấy đơn vé để duyệt!');
        }

        // 4. State Machine Validation
        if (!isValidStateTransition(booking.status, 'CONFIRMED')) {
            throw new Error(`Không thể chuyển trạng thái đơn từ ${booking.status} sang CONFIRMED!`);
        }

        const updatedBooking = await prisma.booking.update({
            where: { id: bookingId },
            data: { status: 'CONFIRMED' },
            include: {
                user: true,
                showtime: { include: { movie: true, room: true } },
                bookingSeats: { include: { seat: true } },
            },
        });

        // Audit log
        await prisma.paymentLog.create({
            data: {
                bookingId: booking.id,
                userId: booking.userId,
                orderId: booking.id,
                amount: booking.totalPrice,
                statusBefore: booking.status,
                statusAfter: 'CONFIRMED',
                isVerified: true,
            },
        }).catch(() => {});

        const seatLabels = updatedBooking.bookingSeats?.map((s) => s.seat?.label || s.seatId);

        // 1. Tạo Notification cho User
        notificationService.createNotification({
            userId: updatedBooking.userId,
            title: '🎟️ VÉ XEM PHIM ĐÃ ĐƯỢC DUYỆT!',
            message: `Vé xem phim "${updatedBooking.showtime?.movie?.title}" (Ghế: ${seatLabels?.join(', ')}) đã được duyệt thành công. Xem ngay tại "Vé Của Tôi"!`,
            type: 'APPROVED',
        }).catch((err) => console.error('Lỗi tạo notif approve:', err.message));

        // 2. Gửi Email xác nhận vé ảo cho User
        emailService.sendUserTicketConfirmation({
            bookingId: updatedBooking.id,
            userName: updatedBooking.user?.name || 'Bạn',
            userEmail: updatedBooking.user?.email,
            movieTitle: updatedBooking.showtime?.movie?.title,
            roomName: updatedBooking.showtime?.room?.name,
            startTime: updatedBooking.showtime?.startTime,
            seatLabels,
            totalPrice: updatedBooking.totalPrice,
        }).catch((err) => console.error('Lỗi gửi email user:', err.message));

        return updatedBooking;
    }

    async cancelBooking(bookingId, userId, userRole) {
        const booking = await bookingRepository.findById(bookingId);
        if (!booking) {
            throw new Error('Không tìm thấy đơn đặt vé cần hủy!');
        }

        if (booking.userId !== userId && userRole !== 'ADMIN') {
            throw new Error('Bạn không có quyền hủy vé này! Chỉ chủ sở hữu vé hoặc Admin mới được phép thao tác.');
        }

        if (booking.status === 'CANCELLED') {
            throw new Error('Đơn vé này đã được hủy trước đó rồi!');
        }

        const startTime = new Date(booking.showtime.startTime).getTime();
        const now = Date.now();
        const hoursUntilShow = (startTime - now) / (1000 * 60 * 60);

        let cutoffHours = 12;
        try {
            const footer = await prisma.footerSetting.findFirst();
            if (footer && typeof footer.cancellationCutoffHours === 'number') {
                cutoffHours = footer.cancellationCutoffHours;
            }
        } catch (e) {}

        if (userRole !== 'ADMIN' && hoursUntilShow < cutoffHours) {
            throw new Error(`Chính sách rạp CINEVERSE: Quý khách chỉ có thể hủy vé trước khi suất chiếu bắt đầu ít nhất ${cutoffHours} tiếng (Quy định của rạp)!`);
        }

        const releasedSeatIds = booking.bookingSeats.map((s) => s.seatId);
        const releasedSeatLabels = booking.bookingSeats.map((s) => s.seat?.label || 'Ghế');
        const cancelledBooking = await bookingRepository.cancelBooking(bookingId);

        // Audit log
        await prisma.paymentLog.create({
            data: {
                bookingId: booking.id,
                userId: booking.userId,
                orderId: booking.id,
                amount: booking.totalPrice,
                statusBefore: booking.status,
                statusAfter: 'CANCELLED',
                isVerified: true,
            },
        }).catch(() => {});

        // Tạo Notification
        notificationService.createNotification({
            userId: booking.userId,
            title: '❌ VÉ ĐÃ ĐƯỢC HỦY',
            message: `Đơn vé #${booking.id.slice(0, 8).toUpperCase()} phim "${booking.showtime?.movie?.title}" đã được hủy thành công.`,
            type: 'CANCELLED',
        }).catch((err) => console.error('Lỗi tạo notif cancel:', err.message));

        return {
            cancelledBooking,
            showtimeId: booking.showtimeId,
            seatIds: releasedSeatIds,
            seatLabels: releasedSeatLabels,
            movieTitle: booking.showtime?.movie?.title,
            startTime: booking.showtime?.startTime,
            roomName: booking.showtime?.room?.name,
        };
    }
}

module.exports = new BookingService();
