const bookingService = require("../services/booking.service");
const { getIO } = require("../config/socket");

class BookingController {
    async getAll(req, res) {
        try {
            const bookings = await bookingService.getAllBookings(req.user.id, req.user.role);
            return res.status(200).json({ bookings });
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }

    async create(req, res) {
        try {
            const { showtimeId, seatIds, paymentMethod, voucherCode } = req.body;
            const booking = await bookingService.createBooking(
                req.user.id,
                showtimeId,
                seatIds,
                paymentMethod,
                voucherCode
            );

            // Phát sự kiện Realtime
            try {
                const io = getIO();
                // Khóa ghế vĩnh viễn trên sơ đồ của phòng chiếu này
                io.to(`showtime:${showtimeId}`).emit('seat:booked', {
                    showtimeId,
                    seatIds,
                });

                // Thông báo đơn hàng mới tức thì cho Admin
                io.emit('admin:new_booking', {
                    bookingId: booking.id,
                    userName: req.user.name || 'Khách hàng',
                    userEmail: req.user.email,
                    movieTitle: booking.showtime?.movie?.title || 'Phim',
                    seatCount: seatIds.length,
                    totalPrice: booking.totalPrice,
                    createdAt: new Date(),
                });
            } catch (socketError) {
                console.error('Lỗi phát socket booking:', socketError.message);
            }

            return res.status(201).json({ message: 'Đặt vé và thanh toán thành công!', booking });
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }

    async cancel(req, res) {
        try {
            const { id } = req.params;
            const result = await bookingService.cancelBooking(id, req.user.id, req.user.role);

            // Phát sự kiện Realtime giải phóng ghế
            try {
                const io = getIO();
                // 1. Mở lại ghế trên sơ đồ
                io.to(`showtime:${result.showtimeId}`).emit('seat:released', {
                    showtimeId: result.showtimeId,
                    seatIds: result.seatIds,
                });

                // 2. Broadcast thông báo toàn hệ thống: Suất chiếu vừa có thêm ghế trống!
                io.emit('showtime:seat_freed', {
                    showtimeId: result.showtimeId,
                    movieTitle: result.movieTitle,
                    roomName: result.roomName,
                    startTime: result.startTime,
                    seatLabels: result.seatLabels,
                    seatCount: result.seatIds.length,
                });
            } catch (socketError) {
                console.error('Lỗi phát socket cancel:', socketError.message);
            }

            return res.status(200).json({ message: 'Hủy vé thành công! Ghế đã được mở lại cho khách khác.', booking: result.cancelledBooking });
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }
}

module.exports = new BookingController();
