const prisma = require("../config/prisma");
const crypto = require("crypto");

class TicketController {
    /**
     * Lấy / Sinh token chữ ký số cho mã QR vé
     */
    async getTicketQR(req, res) {
        try {
            const { bookingId } = req.params;
            const booking = await prisma.booking.findUnique({
                where: { id: bookingId },
                include: {
                    user: { select: { id: true, name: true, email: true } },
                    showtime: { include: { movie: true, room: true } },
                    bookingSeats: { include: { seat: true } },
                }
            });

            if (!booking) {
                return res.status(404).json({ message: 'Không tìm thấy vé xem phim!' });
            }

            // Kiểm tra quyền (chủ sở hữu hoặc admin)
            if (booking.userId !== req.user.id && req.user.role !== 'ADMIN') {
                return res.status(403).json({ message: 'Bạn không có quyền xem vé này!' });
            }

            let token = booking.ticketToken;
            if (!token) {
                const secret = process.env.JWT_SECRET || 'cineverse_secret_2026';
                token = crypto.createHmac('sha256', secret)
                    .update(`${booking.id}:${booking.userId}:${booking.createdAt.getTime()}`)
                    .digest('hex');

                await prisma.booking.update({
                    where: { id: booking.id },
                    data: { ticketToken: token },
                });
            }

            const qrPayload = JSON.stringify({
                bookingId: booking.id,
                token,
                movieTitle: booking.showtime?.movie?.title,
                roomName: booking.showtime?.room?.name,
                seats: booking.bookingSeats?.map((s) => s.seat?.label).join(', '),
                startTime: booking.showtime?.startTime,
            });

            return res.status(200).json({
                bookingId: booking.id,
                token,
                qrPayload,
                isCheckedIn: booking.isCheckedIn,
                checkInAt: booking.checkInAt,
            });
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }

    /**
     * Soát vé tại rạp (Chỉ Admin / Nhân viên soát vé)
     */
    async verifyAndCheckIn(req, res) {
        try {
            const { bookingId, token } = req.body;

            if (!bookingId) {
                return res.status(400).json({ message: 'Vui lòng cung cấp mã đơn vé!' });
            }

            const booking = await prisma.booking.findUnique({
                where: { id: bookingId },
                include: {
                    user: { select: { id: true, name: true, email: true } },
                    showtime: { include: { movie: true, room: true } },
                    bookingSeats: { include: { seat: true } },
                }
            });

            if (!booking) {
                return res.status(404).json({
                    success: false,
                    code: 'NOT_FOUND',
                    message: `Không tìm thấy mã đơn vé #${bookingId} trong hệ thống rạp!`
                });
            }

            // 1. Kiểm tra trạng thái đơn
            if (booking.status !== 'CONFIRMED') {
                return res.status(400).json({
                    success: false,
                    code: 'INVALID_STATUS',
                    message: `Vé không hợp lệ! Trạng thái hiện tại: ${booking.status} (Chỉ vé CONFIRMED mới được vào rạp).`
                });
            }

            // 2. Chống chụp/share ảnh vé: Verify chữ ký số token nếu có truyền token
            if (token && booking.ticketToken && token !== booking.ticketToken) {
                return res.status(403).json({
                    success: false,
                    code: 'INVALID_SIGNATURE',
                    message: 'Chữ ký bảo mật của vé không khớp! Nghi vấn mã QR giả mạo hoặc chụp lại từ nguồn khác.'
                });
            }

            // 3. CHẶN DOUBLE CHECK-IN: Kiểm tra xem vé đã soát trước đó chưa
            if (booking.isCheckedIn) {
                const checkedTime = new Date(booking.checkInAt).toLocaleString('vi-VN');
                return res.status(400).json({
                    success: false,
                    code: 'ALREADY_CHECKED_IN',
                    message: `🚨 CẢNH BÁO: Vé này ĐÃ ĐƯỢC SOÁT vào lúc ${checkedTime}! Nghi vấn vé bị chia sẻ hoặc quét nhiều lần.`,
                    checkedAt: booking.checkInAt,
                    booking,
                });
            }

            // 4. Đánh dấu đã sử dụng vé ngay lập tức
            const now = new Date();
            const updated = await prisma.booking.update({
                where: { id: bookingId },
                data: {
                    isCheckedIn: true,
                    checkInAt: now,
                },
                include: {
                    user: { select: { id: true, name: true, email: true } },
                    showtime: { include: { movie: true, room: true } },
                    bookingSeats: { include: { seat: true } },
                }
            });

            const seatLabels = updated.bookingSeats?.map((s) => s.seat?.label).join(', ');

            return res.status(200).json({
                success: true,
                code: 'CHECKIN_SUCCESS',
                message: `✅ SOÁT VÉ HỢP LỆ THÀNH CÔNG! Mời quý khách vào phòng "${updated.showtime?.room?.name}". Ghế: [${seatLabels}].`,
                checkInAt: now,
                booking: updated,
            });
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }
}

module.exports = new TicketController();
