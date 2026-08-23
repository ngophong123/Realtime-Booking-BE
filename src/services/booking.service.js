const bookingRepository = require("../repositories/booking.repository");
const showtimeRepository = require("../repositories/showtime.repository");
const roomRepository = require("../repositories/room.repository");
const seatHoldRepository = require("../repositories/seathold.repository");

class BookingService {

    async createBooking(userId, showtimeId, seatIds) {
        
        if ( !showtimeId || !Array.isArray(seatIds) || seatIds.length === 0 ) {
            throw new Error('Vui lòng chọn suất chiếu và ít nhất một chiếc ghế!')
        }

        await seatHoldRepository.deleteExpireHolds();

        const showtime = await showtimeRepository.findById(showtimeId);
        if (!showtime) {
            throw new Error('Không tìm thấy suất chiếu yêu cầu!');
        }

        const seats = await roomRepository.findSeatsByIds(seatIds);
        if (seats.length !== seatIds.length) {
            throw new Error('Có ghế không tồn tại trong hệ thống!');
        }

        const invalidSeat = seats.find((seat) => seat.roomId !== showtime.roomId);
        if (invalidSeat) {
            throw new Error(`Ghế ${invalidSeat.label} không thuộc phòng chiếu của suất chiếu này!`)
        }

        const bookedSeat = await bookingRepository.findBookedSeatsForShowtime(showtimeId, seatIds);
        if (bookedSeat) {
            throw new Error(`Ghế ${bookedSeat.seat.label} đã được người khác đặt trước!`)
        }

        const activeHold = await seatHoldRepository.findActiveHoldsByOthers(showtimeId, seatIds, userId);
        if(activeHold) {
            throw new Error(`Ghế ${activeHold.seat.label} đang được người dùng khác giữ chỗ!`);
        }

        let totalPrice = 0;
        const basePrice = parseFloat(showtime.price);

        const seatsData = seats.map((seat) => {
            let finalPrice = basePrice;
            switch (seat.type) {
                case 'VIP' : finalPrice += 20000;
                break;
                case 'COUPLE' : finalPrice += 40000;
                break;
                default:
                break;
            }

            totalPrice += finalPrice;

            return {
                seatId: seat.id,
                price: finalPrice,
            };
        });

        const bookingResult= await bookingRepository.createBooking(userId, showtimeId, seatsData, totalPrice);

        await seatHoldRepository.deleteHolds(userId, showtimeId, seatIds);
        return bookingResult;
    }
}

module.exports = new BookingService();