const bookingRepository = require("../repositories/booking.repository");
const showtimeRepository = require("../repositories/showtime.repository");
const roomRepository = require("../repositories/room.repository");
const seatHoldRepository = require("../repositories/seathold.repository");
const voucherService = require("./voucher.service");
const emailService = require("./email.service");
const notificationService = require("./notification.service");
const prisma = require("../config/prisma");

class BookingService {
    async getAllBookings(userId, role) {
        const isAdmin = role === 'ADMIN';
        return await bookingRepository.findAll(userId, isAdmin);
    }

    async createBooking(userId, showtimeId, seatIds, paymentMethod = 'MOMO', voucherCode = null, user = {}) {
        if (!showtimeId || !Array.isArray(seatIds) || seatIds.length === 0) {
            throw new Error('Vui lòng chọn suất chiếu và ít nhất một chiếc ghế!');
        }

        // Chống thanh toán lặp
        const recentBooking = await bookingRepository.findRecentBooking(userId, showtimeId, seatIds);
        if (recentBooking) {
            return recentBooking;
        }

        await seatHoldRepository.deleteExpireHolds();

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
            throw new Error(`Rất tiếc! Ghế ${bookedSeat.seat.label} vừa được khách hàng khác nhanh tay đặt trước. Vui lòng chọn ghế khác!`);
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

        // Tạo đơn hàng
        const bookingResult = await bookingRepository.createBooking(
            userId,
            showtimeId,
            seatsData,
            finalTotalPrice,
            discountAmount,
            voucherCode ? voucherCode.trim() : null,
            paymentMethod || 'MOMO'
        );

        await seatHoldRepository.deleteHolds(userId, showtimeId, seatIds);

        const seatLabels = seats.map(s => s.label);

        // 1. Tạo Notification cho Admin & User
        notificationService.createNotification({
            userId: null, // Cho Admin
            title: '🔔 ĐƠN ĐẶT VÉ MỚI!',
            message: `${user.name || 'Khách'} vừa đặt ${seatIds.length} vé phim "${showtime.movie?.title}" (${seatLabels.join(', ')}). Tổng: ${finalTotalPrice.toLocaleString('vi-VN')}đ`,
            type: 'BOOKING',
        }).catch(err => console.error('Lỗi tạo notif admin:', err.message));

        notificationService.createNotification({
            userId: userId,
            title: '⏳ ĐƠN VÉ ĐANG CHỜ DUYỆT',
            message: `Bạn vừa đặt vé xem phim "${showtime.movie?.title}". Vui lòng chờ quản trị viên xác nhận!`,
            type: 'BOOKING',
        }).catch(err => console.error('Lỗi tạo notif user:', err.message));

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
        }).catch(err => console.error('Lỗi gửi email admin:', err.message));
        
        return {
            ...bookingResult,
            showtime,
            seatsData,
            seatLabels,
        };
    }

    async approveBooking(bookingId) {
        const booking = await bookingRepository.findById(bookingId);
        if (!booking) {
            throw new Error('Không tìm thấy đơn vé để duyệt!');
        }

        const updatedBooking = await prisma.booking.update({
            where: { id: bookingId },
            data: { status: 'CONFIRMED' },
            include: {
                user: true,
                showtime: { include: { movie: true, room: true } },
                bookingSeats: { include: { seat: true } },
            }
        });

        const seatLabels = updatedBooking.bookingSeats?.map((s) => s.seat?.label || s.seatId);

        // 1. Tạo Notification cho User
        notificationService.createNotification({
            userId: updatedBooking.userId,
            title: '🎟️ VÉ XEM PHIM ĐÃ ĐƯỢC DUYỆT!',
            message: `Vé xem phim "${updatedBooking.showtime?.movie?.title}" (Ghế: ${seatLabels?.join(', ')}) đã được duyệt thành công. Xem ngay tại "Vé Của Tôi"!`,
            type: 'APPROVED',
        }).catch(err => console.error('Lỗi tạo notif approve:', err.message));

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
        }).catch(err => console.error('Lỗi gửi email user:', err.message));

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

        if (userRole !== 'ADMIN' && hoursUntilShow < 12) {
            throw new Error('Chính sách rạp CINEVERSE: Quý khách chỉ có thể hủy vé trước khi suất chiếu bắt đầu ít nhất 12 tiếng!');
        }

        const releasedSeatIds = booking.bookingSeats.map((s) => s.seatId);
        const releasedSeatLabels = booking.bookingSeats.map((s) => s.seat?.label || 'Ghế');
        const cancelledBooking = await bookingRepository.cancelBooking(bookingId);

        // Tạo Notification
        notificationService.createNotification({
            userId: booking.userId,
            title: '❌ VÉ ĐÃ ĐƯỢC HỦY',
            message: `Đơn vé #${booking.id.slice(0, 8).toUpperCase()} phim "${booking.showtime?.movie?.title}" đã được hủy thành công.`,
            type: 'CANCELLED',
        }).catch(err => console.error('Lỗi tạo notif cancel:', err.message));

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
