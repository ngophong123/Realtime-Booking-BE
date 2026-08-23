const seatHoldService = require("../services/seathold.service");
const { getIO } = require("../config/socket");

class SeatHoldController {

    async hold(req, res) {
        try {
            const { showtimeId, seatIds } = req.body;
            const userId = req.user.id;

            if (!showtimeId || !seatIds ) {
                return res.status(400).json({
                    message: 'Vui lòng cung cấp đầy đủ showtimeId và seatIds!'
                });
            }

            const result = await seatHoldService.holdSeats(userId, showtimeId, seatIds);

            try {
                const io = getIO();
                io.to(showtimeId).emit('seat:held', {
                    showtimeId,
                    seatIds,
                    userId,
                });
            } catch (socketError) {
                console.log('Lỗi phát sự kiện socket seat:held', socketError.message);
            }
            return res.status(201).json({
                message: 'Giữ ghế tạm thời thành công trong 5p!', result,
            });
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }

    async release(req, res) {
        try {
            const { showtimeId, seatIds } = req.body;
            const userId = req.user.id;

            if (!showtimeId || !seatIds) {
                return res.status(400).json({
                    message: 'Vui lòng cung cấp đầy đủ showtimeId và seatIds!'
                });

        }

        const result = await seatHoldService.releaseSeats(userId, showtimeId, seatIds);
        try {
        const io = getIO();
        io.to(showtimeId).emit('seat:released', {
          showtimeId,
          seatIds,
        });
      } catch (socketError) {
        console.error('Lỗi phát sự kiện socket seat:released:', socketError.message);
      }
        return res.status(200).json(result);
    }   
         catch (error) {
            return res.status(400).json({ message: error.message});
        }
    }
}

module.exports = new SeatHoldController();