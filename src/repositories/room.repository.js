const prisma = require("../config/prisma");

class RoomRepository {

    async findAll() {
        return await prisma.room.findMany({
            include: { seats: true },
        })
    }

    async findById(id) {
        return await prisma.room.findUnique({
            where: { id },
        });
    }

    async findSeatsByIds(ids) {
        return await prisma.seat.findMany({
            where: {
                id: { in: ids },
            },
        });
    }

async createWithSeat(name, rows, columns, seatsList) {
    return await prisma.$transaction(async (tx) =>{

        const room = await tx.room.create({
            data: { name, rows, columns}
        });

        const seatsData = seatsList.map(seat => ({
           ...seat,
           roomId: room.id
        }));

        await tx.seat.createMany({
            data: seatsData
        });
        return room;
    });
}
}

module.exports = new RoomRepository();