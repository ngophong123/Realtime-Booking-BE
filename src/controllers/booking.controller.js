const bookingService = require("../services/booking.service");
const { getIO } = require("../config/socket");

class BookingController {

    async getAll(req, res) {
        try {
            const bookings = await bookingService.getAllBookings(req.user.id, req.user.role);
            return res.status(200).json({ bookings });
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }

    async create(req, res) {
        try {
            const { showtimeId, seatIds } = req.body;
            const userId = req.user.id;

            if (!showtimeId || !seatIds) {
                return res.status(400).json({
                    message: 'Vui lòng cung cấp đầy đủ thông tin showtimeId và seatIds!'
                });
            }

            const booking = await bookingService.createBooking(userId, showtimeId, seatIds);

            try {
                const io = getIO();
                io.to(showtimeId).emit('seat:booked', {
                    showtimeId,
                    seatIds,
                    bookingId: booking.id,
                });
            } catch (socketError) {
                console.error('Lỗi phát sự kiện socket seat:booked:', socketError.message);
            }
      
            return res.status(201).json({
                message: 'Đặt vé thành công!',
                booking
            });
        } catch (error) {
            return res.status(400).json({
                message: error.message 
            });
        }
    }

    async cancel(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const userRole = req.user.role;

            const result = await bookingService.cancelBooking(id, userId, userRole);

            try {
                const io = getIO();
                io.to(result.showtimeId).emit('seat:released', {
                    showtimeId: result.showtimeId,
                    seatIds: result.seatIds,
                });
            } catch (socketError) {
                console.error('Lỗi phát sự kiện socket seat:released:', socketError.message);
            }

            return res.status(200).json({
                message: 'Hủy vé thành công! Các ghế đã được hoàn trả về trạng thái trống.',
                booking: result.cancelledBooking,
            });
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }
}

module.exports = new BookingController();
