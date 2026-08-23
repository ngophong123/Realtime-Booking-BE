const roomService = require("../services/room.service");

class RoomController {

async getAll(req, res) {
    try {
        const rooms = await roomService.getAllRooms();
        return res.status(200).json({ rooms });
    } catch (error) {
        return res.status(500).json({ message: error.message});
    }
}

async create(req, res) {
    try {
        const { name, rows, columns } = req.body;
        if (!name || !rows || !columns) {
           return  res.status(400).json({ message: 'Vui lòng điền đầy đủ tên phòng, só hàng và số cột!'});
        }
        const room = await roomService.createRoom(req.body);
        return res.status(201).json({ message: 'Tạo phòng chiếu và tự sinh danh sách ghế thành công!', room});
    } catch (error) {
        return res.status(400).json({ message: error.message});
    }
}
}

module.exports = new RoomController();