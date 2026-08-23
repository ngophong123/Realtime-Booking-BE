const prisma = require("../config/prisma");

class ShowtimeRepository {
    async findAll() {
        return await prisma.showtime.findMany({
            include: {
                movie: true,
                room: true,
            },
            orderBy: { startTime: 'asc'},
        })
    }

    async findById(id) {
        return await prisma.showtime.findUnique({
            where: { id },
            include: {
                movie: true,
                room: {
                    include: {seats: {
                        orderBy: [
                            {row: 'asc'},
                            {column: 'asc'},
                        ]
                    } }
                },
            },
        });
    }

    async findConflict(roomId, startTime, endTime) {
        return await prisma.showtime.findFirst({
            where: {
                roomId,
                AND : [
                    { startTime: { lt: endTime }},
                    { endTime: { gt: startTime}},
                ],
            },
        });
    }

    async create(showtimeData) {
        return await prisma.showtime.create({
            data: showtimeData,
            include: {
                movie: true,
                room: true,
            },
        });
    }

    async getBookedSeats(showtimeId) {
        return await prisma.bookingSeat.findMany({
            where: {
                booking: {
                    showtimeId,
                    status: 'CONFIRMED',
                },
            },
            select: {
                seatId: true,
            },
        });
    }

    async getActiveHolds(showtimeId) {
        return await prisma.seatHold.findMany({
            where: {
                showtimeId,
                expireAt: {
                    gt: new Date(),
                },
            },
            select: {
                seatId: true,
                userId: true,
            },
        });
    }
}

module.exports = new ShowtimeRepository();