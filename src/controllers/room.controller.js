const roomService = require("../services/room.service");

class RoomController {
    async getAll(req, res) {
        try {
            const rooms = await roomService.getAllRooms();
            return res.status(200).json({ rooms });
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }

    async getById(req, res) {
        try {
            const { id } = req.params;
            const room = await roomService.getRoomById(id);
            if (!room) return res.status(404).json({ message: 'Không tìm thấy phòng chiếu!' });
            return res.status(200).json({ room });
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }

    async create(req, res) {
        try {
            const { name, rows, columns } = req.body;
            if (!name || !rows || !columns) {
                return res.status(400).json({ message: 'Vui lòng điền đầy đủ tên phòng, số hàng và số cột!' });
            }
            const room = await roomService.createRoom(req.body);
            return res.status(201).json({ message: 'Tạo phòng chiếu và tự sinh danh sách ghế thành công!', room });
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }

    async update(req, res) {
        try {
            const { id } = req.params;
            const updatedRoom = await roomService.updateRoom(id, req.body);
            return res.status(200).json({ message: 'Cập nhật phòng chiếu thành công!', room: updatedRoom });
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }

    async updateSeats(req, res) {
        try {
            const { id } = req.params;
            const { seatIds, type } = req.body;
            await roomService.updateSeatTypes(id, seatIds, type);
            return res.status(200).json({ message: 'Cập nhật cấu hình loại ghế thành công!' });
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }

    async delete(req, res) {
        try {
            const { id } = req.params;
            await roomService.deleteRoom(id);
            return res.status(200).json({ message: 'Xóa phòng chiếu thành công!' });
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }
}

module.exports = new RoomController();
