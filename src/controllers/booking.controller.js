const bookingService = require("../services/booking.service");
const { getIO } = require("../config/socket");

class BookingController {

    async create(req, res) {
        try {
            const { showtimeId, seatIds } = req.body;
            const userId = req.user.id;

            if (!showtimeId || !seatIds) {
                return res.status(400).json({
                    message: 'Vui lòng cung cấp đầy đủ thông tin showtimeId và seatIds!'
                });
            }

            const booking = await bookingService.createBooking(userId, showtimeId, seatIds );

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
                message: 'Đặt vé thành công!', booking
            });
        } catch (error) {
            return res.status(400).json({
                message: error.message 
            });

        }
    }
}

module.exports = new BookingController();