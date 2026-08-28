const prisma = require("../config/prisma");

class RoomRepository {
    async findAll() {
        return await prisma.room.findMany({
            include: {
                seats: {
                    orderBy: [
                        { row: 'asc' },
                        { column: 'asc' }
                    ]
                }
            },
            orderBy: { createdAt: 'asc' }
        });
    }

    async findById(id) {
        return await prisma.room.findUnique({
            where: { id },
            include: {
                seats: {
                    orderBy: [
                        { row: 'asc' },
                        { column: 'asc' }
                    ]
                }
            }
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
        return await prisma.$transaction(async (tx) => {
            const room = await tx.room.create({
                data: { name, rows, columns }
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

    async updateRoom(id, name) {
        return await prisma.room.update({
            where: { id },
            data: { name }
        });
    }

    async updateSeatTypes(roomId, seatIds, type) {
        return await prisma.seat.updateMany({
            where: {
                roomId,
                id: { in: seatIds }
            },
            data: { type }
        });
    }

    async delete(id) {
        return await prisma.room.delete({
            where: { id }
        });
    }
}

module.exports = new RoomRepository();
