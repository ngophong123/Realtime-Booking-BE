const roomRepository = require("../repositories/room.repository");

class RoomService {
    async getAllRooms() {
        return await roomRepository.findAll();
    }

    async createRoom(roomData) {
        const { name, rows, columns } = roomData;
        
        if(!name || rows <= 0 || columns <= 0) {
            throw new Error('Tên phòng, số hàng và số cột phải hợp lệ!');
        }
        if( rows > 26) {
            throw new Error('Số hàng ghế tối đa chỉ được là 26 hàng!')
        }

        const seatList = [];

        for(let r = 0; r < rows; r++) {
            const rowLabel = String.fromCharCode(65 + r);
            for (let c = 1; c <= columns; c++) {
            seatList.push({
                row: rowLabel,
                column: c,
                label: `${rowLabel}${c}`,
                type: 'STANDARD',
            });
        }
    }

        return await roomRepository.createWithSeat(name, parseInt(rows), parseInt(columns), seatList);
    }
}

module.exports = new RoomService();