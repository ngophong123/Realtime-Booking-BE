const prisma = require("../config/prisma");

class BookingRepository {
    async findBookedSeatsForShowtime(showtimeId, seatIds) {
        return await prisma.bookingSeat.findFirst({
            where: {
                seatId: { in: seatIds },
                booking: {
                    showtimeId,
                    status: 'CONFIRMED',
                },
            },
            include: { seat: true },
        });
    }

    async findRecentBooking(userId, showtimeId, seatIds) {
        const tenSecondsAgo = new Date(Date.now() - 10 * 1000);
        return await prisma.booking.findFirst({
            where: {
                userId,
                showtimeId,
                status: 'CONFIRMED',
                createdAt: { gte: tenSecondsAgo },
                bookingSeats: {
                    some: {
                        seatId: { in: seatIds }
                    }
                }
            },
            include: {
                bookingSeats: { include: { seat: true } },
                showtime: { include: { movie: true, room: true } },
            }
        });
    }

    async findById(id) {
        return await prisma.booking.findUnique({
            where: { id },
            include: {
                user: true,
                showtime: { include: { movie: true, room: true } },
                bookingSeats: { include: { seat: true } }
            }
        });
    }

    async createBooking(userId, showtimeId, seatsData, totalPrice, discountAmount = 0, voucherCode = null, paymentMethod = 'MOMO') {
        return await prisma.$transaction(async (tx) => {
            const booking = await tx.booking.create({
                data: {
                    userId,
                    showtimeId,
                    totalPrice,
                    discountAmount: discountAmount ? Number(discountAmount) : 0,
                    voucherCode: voucherCode ? voucherCode.toUpperCase() : null,
                    paymentMethod: paymentMethod || 'MOMO',
                    status: 'CONFIRMED',
                },
            });

            const bookingSeats = seatsData.map((item) => ({
                bookingId: booking.id,
                seatId: item.seatId,
                price: item.price,
            }));

            await tx.bookingSeat.createMany({
                data: bookingSeats,
            });

            if (voucherCode) {
                await tx.voucher.updateMany({
                    where: { code: voucherCode.toUpperCase() },
                    data: { usedCount: { increment: 1 } }
                });
            }

            return {
                ...booking,
                seats: bookingSeats,
            };
        });
    }

    async cancelBooking(bookingId) {
        return await prisma.$transaction(async (tx) => {
            await tx.bookingSeat.deleteMany({
                where: { bookingId }
            });

            const updatedBooking = await tx.booking.update({
                where: { id: bookingId },
                data: { status: 'CANCELLED' },
                include: {
                    showtime: { include: { movie: true, room: true } }
                }
            });

            return updatedBooking;
        });
    }

    async findAll(userId = null, isAdmin = false) {
        const where = isAdmin ? {} : { userId };
        return await prisma.booking.findMany({
            where,
            include: {
                user: { select: { id: true, name: true, email: true } },
                showtime: {
                    include: {
                        movie: true,
                        room: true,
                    }
                },
                bookingSeats: {
                    include: {
                        seat: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }
}

module.exports = new BookingRepository();
