const roomRepository = require("../repositories/room.repository");

class RoomService {
    async getAllRooms() {
        return await roomRepository.findAll();
    }

    async getRoomById(id) {
        return await roomRepository.findById(id);
    }

    async createRoom(roomData) {
        const { name, rows, columns, type } = roomData;
        const roomType = type || 'STANDARD';
        
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
                let defaultSeatType = 'STANDARD';

                if (roomType === 'VIP') {
                    defaultSeatType = 'VIP';
                } else if (roomType === 'COUPLE') {
                    defaultSeatType = 'COUPLE';
                } else if (roomType === 'IMAX') {
                    defaultSeatType = r < Math.floor(rows / 2) ? 'STANDARD' : 'VIP';
                } else {
                    // STANDARD room
                    if (r >= Math.floor(rows / 2) && r < rows - 1) defaultSeatType = 'VIP';
                    if (r === rows - 1) defaultSeatType = 'COUPLE';
                }

                seatList.push({
                    row: rowLabel,
                    column: c,
                    label: `${rowLabel}${c}`,
                    type: defaultSeatType,
                });
            }
        }

        return await roomRepository.createWithSeat(name, parseInt(rows), parseInt(columns), seatList, roomType);
    }

    async updateRoom(id, data) {
        const updateData = {};
        if (data.name) updateData.name = data.name.trim();
        if (data.type) updateData.type = data.type;

        return await roomRepository.updateRoom(id, updateData);
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
