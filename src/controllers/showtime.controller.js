const showtimeService = require("../services/showtime.service");

class ShowtimeController {
    async getAll(req, res) {
        try {
            const showtimes = await showtimeService.getAllShowtimes();
            return res.status(200).json({ showtimes });
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }

    async getDetail(req, res) {
        try {
            const { id } = req.params;
            const data = await showtimeService.getShowtimeDetail(id);
            return res.status(200).json(data);
        } catch (error) {
            return res.status(404).json({ message: error.message });
        }
    }

    async create(req, res) {
        try {
            const showtime = await showtimeService.createShowtime(req.body);
            return res.status(201).json({ message: 'Tạo suất chiếu thành công!', showtime });
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }

    async update(req, res) {
        try {
            const { id } = req.params;
            const showtime = await showtimeService.updateShowtime(id, req.body);
            return res.status(200).json({ message: 'Cập nhật suất chiếu thành công!', showtime });
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }

    async delete(req, res) {
        try {
            const { id } = req.params;
            await showtimeService.deleteShowtime(id);
            return res.status(200).json({ message: 'Xóa suất chiếu thành công!' });
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }
}

module.exports = new ShowtimeController();
