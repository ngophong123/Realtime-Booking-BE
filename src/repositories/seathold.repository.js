const prisma = require("../config/prisma");

class SeatHoldRepository {

    async deleteExpireHolds() {
        return await prisma.seatHold.deleteMany({
            where: {
                expireAt: {
                    lte: new Date(),
                },
            },
        });
    }

    async findActiveHoldsByOthers(showtimeId, seatIds, userId) {
        return await prisma.seatHold.findFirst({
            where: {
                showtimeId,
                seatId: {in: seatIds},
            userId: {
                not: userId,
            },
            expireAt: {
                gt: new Date(),
            }
        },
        include: {
            seat: true,
        },
        });
    }

    async createHolds(userId, showtimeId, seatIds, expireAt) {
        return await prisma.$transaction(async (tx) => {

            await tx.seatHold.deleteMany({
                where: {
                    showtimeId,
                    seatId: {in: seatIds},
                    userId,
                },
            });

            const holdsData = seatIds.map((seatId) => ({
                userId,
                showtimeId,
                seatId,
                expireAt,
            }));

            await tx.seatHold.createMany({
                data: holdsData,
            });

            return holdsData;
        });
    }

    async deleteHolds(userId, showtimeId, seatIds) {
      return await prisma.seatHold.deleteMany({
        where: {
            showtimeId,
            seatId: {in: seatIds},
            userId,
        },
      });
    }
}

module.exports = new SeatHoldRepository();