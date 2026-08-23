const showtimeService = require("../services/showtime.service");
const jwt = require("jsonwebtoken");

class ShowtimeController {

    async getAll(req, res) {
        try {
            const showtimes = await showtimeService.getAllShowtimes();
            return res.status(200).json({ showtimes });
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }

    async getById(req, res) {
        try {
            const { id } = req.params;
            const showtime = await showtimeService.getShowtimeById(id);
            return res.status(200).json({ showtime });
        } catch (error) {
            return res.status(404).json({ message: error.message });
        }
    }

    async create(req, res) {
        try {
            const { movieId, roomId, startTime, endTime, price } = req.body;
            if( !movieId || !roomId || !startTime || !endTime || !price ) {
                return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin suất chiếu!'})
            }

            const showtime = await showtimeService.createShowtime(req.body);
            return res.status(201).json({ message: 'Tạo suất chiếu mới thành công!', showtime});
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }

    async getSeatMap(req, res) {
        try {
            const {id} = req.params;

            let userId = null;
            if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
                try {
                    const token = req.headers.authorization.split(' ')[1];
                    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
                    userId = decoded.id;
                } catch (e) {
                    // Token không hợp lệ hoặc hết hạn thì coi như khách vãng lai (userId = null)
                }
            }
            const seatMap = await showtimeService.getShowtimeSeatMap(id, userId);
            return res.status(200).json(seatMap);

        } catch (error) {
            return res.status(400).json({message: error.message});
        }
    }
}

module.exports = new ShowtimeController();