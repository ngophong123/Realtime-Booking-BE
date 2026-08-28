const bookingRepository = require("../repositories/booking.repository");
const showtimeRepository = require("../repositories/showtime.repository");
const roomRepository = require("../repositories/room.repository");
const seatHoldRepository = require("../repositories/seathold.repository");
const voucherService = require("./voucher.service");

class BookingService {
    async getAllBookings(userId, role) {
        const isAdmin = role === 'ADMIN';
        return await bookingRepository.findAll(userId, isAdmin);
    }

    async createBooking(userId, showtimeId, seatIds, paymentMethod = 'MOMO', voucherCode = null) {
        if (!showtimeId || !Array.isArray(seatIds) || seatIds.length === 0) {
            throw new Error('Vui lòng chọn suất chiếu và ít nhất một chiếc ghế!');
        }

        // 1. Chống lỗi thanh toán lặp (Double billing prevention)
        const recentBooking = await bookingRepository.findRecentBooking(userId, showtimeId, seatIds);
        if (recentBooking) {
            return recentBooking;
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

        // 2. Đảm bảo tất cả ghế phải thuộc đúng phòng chiếu của suất chiếu
        const invalidSeat = seats.find((seat) => seat.roomId !== showtime.roomId);
        if (invalidSeat) {
            throw new Error(`Ghế ${invalidSeat.label} không thuộc phòng chiếu của suất chiếu này!`);
        }

        // 3. Xử lý Race condition / Concurrency: Kiểm tra ghế đã bán
        const bookedSeat = await bookingRepository.findBookedSeatsForShowtime(showtimeId, seatIds);
        if (bookedSeat) {
            throw new Error(`Rất tiếc! Ghế ${bookedSeat.seat.label} vừa được khách hàng khác nhanh tay đặt trước. Vui lòng chọn ghế khác!`);
        }

        // Kiểm tra ghế đang bị người khác giữ
        const activeHold = await seatHoldRepository.findActiveHoldsByOthers(showtimeId, seatIds, userId);
        if (activeHold) {
            throw new Error(`Rất tiếc! Ghế ${activeHold.seat.label} đang được khách hàng khác giữ chỗ. Vui lòng chọn ghế khác!`);
        }

        // 4. Tính toán giá tiền theo loại ghế (STANDARD, VIP, COUPLE)
        let subTotal = 0;
        const basePrice = parseFloat(showtime.price);

        const seatsData = seats.map((seat) => {
            let finalPrice = basePrice;
            switch (seat.type) {
                case 'VIP':
                    finalPrice += 20000;
                    break;
                case 'COUPLE':
                    finalPrice += 40000;
                    break;
                default:
                    break;
            }

            subTotal += finalPrice;

            return {
                seatId: seat.id,
                price: finalPrice,
            };
        });

        // 5. Xử lý Voucher giảm giá nếu có
        let discountAmount = 0;
        if (voucherCode && voucherCode.trim() !== '') {
            const voucherResult = await voucherService.validateAndApply(voucherCode.trim(), subTotal);
            discountAmount = voucherResult.discountAmount;
        }

        const finalTotalPrice = Math.max(0, subTotal - discountAmount);

        // 6. Thực hiện transaction tạo đơn
        const bookingResult = await bookingRepository.createBooking(
            userId,
            showtimeId,
            seatsData,
            finalTotalPrice,
            discountAmount,
            voucherCode ? voucherCode.trim() : null,
            paymentMethod || 'MOMO'
        );

        await seatHoldRepository.deleteHolds(userId, showtimeId, seatIds);
        
        return {
            ...bookingResult,
            showtime,
            seatsData,
        };
    }

    async cancelBooking(bookingId, userId, userRole) {
        const booking = await bookingRepository.findById(bookingId);
        if (!booking) {
            throw new Error('Không tìm thấy đơn đặt vé cần hủy!');
        }

        // 7. Phân quyền: Chỉ chính chủ hoặc Admin
        if (booking.userId !== userId && userRole !== 'ADMIN') {
            throw new Error('Bạn không có quyền hủy vé này! Chỉ chủ sở hữu vé hoặc Admin mới được phép thao tác.');
        }

        if (booking.status === 'CANCELLED') {
            throw new Error('Đơn vé này đã được hủy trước đó rồi!');
        }

        // 8. Chính sách hủy vé trước 12 tiếng (Admin được miễn trừ)
        const startTime = new Date(booking.showtime.startTime).getTime();
        const now = Date.now();
        const hoursUntilShow = (startTime - now) / (1000 * 60 * 60);

        if (userRole !== 'ADMIN' && hoursUntilShow < 12) {
            throw new Error('Chính sách rạp CINEVERSE: Quý khách chỉ có thể hủy vé trước khi suất chiếu bắt đầu ít nhất 12 tiếng!');
        }

        const releasedSeatIds = booking.bookingSeats.map((s) => s.seatId);
        const releasedSeatLabels = booking.bookingSeats.map((s) => s.seat?.label || 'Ghế');
        const cancelledBooking = await bookingRepository.cancelBooking(bookingId);

        return {
            cancelledBooking,
            showtimeId: booking.showtimeId,
            seatIds: releasedSeatIds,
            seatLabels: releasedSeatLabels,
            movieTitle: booking.showtime?.movie?.title,
            startTime: booking.showtime?.startTime,
            roomName: booking.showtime?.room?.name,
        };
    }
}

module.exports = new BookingService();
