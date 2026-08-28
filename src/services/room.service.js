const roomRepository = require("../repositories/room.repository");

class RoomService {
    async getAllRooms() {
        return await roomRepository.findAll();
    }

    async getRoomById(id) {
        return await roomRepository.findById(id);
    }

    async createRoom(roomData) {
        const { name, rows, columns } = roomData;
        
        if (!name || rows <= 0 || columns <= 0) {
            throw new Error('Tên phòng, số hàng và số cột phải hợp lệ!');
        }
        if (rows > 26) {
            throw new Error('Số hàng ghế tối đa chỉ được là 26 hàng!');
        }

        const seatList = [];

        for (let r = 0; r < rows; r++) {
            const rowLabel = String.fromCharCode(65 + r);
            for (let c = 1; c <= columns; c++) {
                let defaultType = 'STANDARD';
                // Hàng gần cuối thường là VIP, hàng cuối có thể là COUPLE nếu cấu hình
                if (r >= Math.floor(rows / 2) && r < rows - 1) defaultType = 'VIP';
                if (r === rows - 1) defaultType = 'COUPLE';

                seatList.push({
                    row: rowLabel,
                    column: c,
                    label: `${rowLabel}${c}`,
                    type: defaultType,
                });
            }
        }

        return await roomRepository.createWithSeat(name, parseInt(rows), parseInt(columns), seatList);
    }

    async updateRoom(id, data) {
        const { name } = data;
        if (!name) {
            throw new Error('Tên phòng chiếu không được để trống!');
        }
        return await roomRepository.updateRoom(id, name);
    }

    async updateSeatTypes(roomId, seatIds, type) {
        if (!Array.isArray(seatIds) || seatIds.length === 0) {
            throw new Error('Vui lòng chọn ít nhất 1 ghế để thay đổi loại!');
        }
        if (!['STANDARD', 'VIP', 'COUPLE'].includes(type)) {
            throw new Error('Loại ghế không hợp lệ (chỉ chấp nhận STANDARD, VIP, COUPLE)!');
        }
        return await roomRepository.updateSeatTypes(roomId, seatIds, type);
    }

    async deleteRoom(id) {
        return await roomRepository.delete(id);
    }
}

module.exports = new RoomService();
