const seatHoldRepository = require("../repositories/seathold.repository");
const bookingRepository = require("../repositories/booking.repository");
const showtimeRepository = require("../repositories/showtime.repository");
const roomRepository = require("../repositories/room.repository");

class SeatHoldService {
    async holdSeats(userId, showtimeId, seatIds) {
        if(!showtimeId || !Array.isArray(seatIds) || seatIds.length === 0) {
            throw new Error('Vui lòng chọn suất chiếu và ít nhất một chiếc ghế!');
        }

        await seatHoldRepository.deleteExpireHolds();

        const showtime = await showtimeRepository.findById(showtimeId);
        if(!showtime) {
            throw new Error('Không tìm thấy suất chiếu theo yêu cầu!');
        }

        const seats = await roomRepository.findSeatsByIds(seatIds);
        if(seats.length !== seatIds.length) {
            throw new Error('Có ghế không tồn tại trên hệ thống!');
        }

        const invalidSeat = seats.find((seat) => 
            seat.roomId !== showtime.roomId);
        if(invalidSeat) {
            throw new Error(`Ghế ${invalidSeat.label} không thuộc phòng của suất chiếu này!`);
        }

        const bookedSeat = await bookingRepository.findBookedSeatsForShowtime(showtimeId, seatIds);
        if(bookedSeat) {
            throw new Error(`Ghế ${bookedSeat.seat.label} đã đươc mua trước đó!`)
        }

        const activeHold = await seatHoldRepository.findActiveHoldsByOthers(showtimeId, seatIds, userId);
        if (activeHold) {
            throw new Error(`Ghế ${activeHold.seat.label} đang được người dùng khác giữ chỗ!`);
        }

         const expireAt = new Date(Date.now() + 5 * 60 * 1000);
    return await seatHoldRepository.createHolds(userId, showtimeId, seatIds, expireAt);
  }

  async releaseSeats(userId, showtimeId, seatIds)
  {
    if (!showtimeId || !Array.isArray(seatIds) || seatIds.length === 0) {
        throw new Error('Vui lòng chọn ít nhất một suất chiếu và ghế để huỷ giữ!')
    }

    await seatHoldRepository.deleteHolds(userId, showtimeId, seatIds);
    return { message: 'Huỷ giữ ghế thành công!'};
  }
}

module.exports = new SeatHoldService();