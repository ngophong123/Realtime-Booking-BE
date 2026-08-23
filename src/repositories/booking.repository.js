const prisma = require("../config/prisma");

class BookingRepository {

    async findBookedSeatsForShowtime(showtimeId, seatIds) {
        return await prisma.bookingSeat.findFirst({
            where:{
                seatId: {
                    in: seatIds,
                },
                booking: {
                    showtimeId,
                    status: 'CONFIRMED',
                },
            },
            include: {
                seat: true,
            },
        });
    }

    async createBooking(userId, showtimeId, seatsData, totalPrice) {
        return await prisma.$transaction(async (tx) => {
            const booking = await tx.booking.create({
                data: {
                    userId,
                    showtimeId,
                    totalPrice,
                    status: 'CONFIRMED',
                },
            });

            const bookingSeats = seatsData.map((item) => ({
                bookingId: booking.id,
                seatId: item.seatId,
                price: item.price,
            })
                
            );

            await tx.bookingSeat.createMany({
                data: bookingSeats,
            });

            return {
                ...booking,
                seats: bookingSeats,
            };
    });
    }
}

module.exports = new BookingRepository();