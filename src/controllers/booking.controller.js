const bookingService = require("../services/booking.service");
const { getIO } = require("../config/socket");
const bookingRepository = require("../repositories/booking.repository");

class BookingController {
    constructor() {
        this.createBooking = this.createBooking.bind(this);
        this.approveBooking = this.approveBooking.bind(this);
        this.cancelBooking = this.cancelBooking.bind(this);
        this.getBookings = this.getBookings.bind(this);
        this.getMyBookings = this.getMyBookings.bind(this);
        this.getAllBookings = this.getAllBookings.bind(this);
        
        // Aliases
        this.create = this.createBooking;
        this.approve = this.approveBooking;
        this.cancel = this.cancelBooking;
        this.getAll = this.getBookings;
    }

    async createBooking(req, res) {
        try {
            const userId = req.user.id;
            const { showtimeId, seatIds, voucherCode, paymentMethod, idempotencyKey } = req.body;
            const user = req.user;

            const reqMeta = {
                ip: req.ip || req.connection?.remoteAddress || '127.0.0.1',
                userAgent: req.headers['user-agent'] || '',
            };

            const booking = await bookingService.createBooking(
                userId,
                showtimeId,
                seatIds,
                voucherCode,
                paymentMethod,
                idempotencyKey || req.headers['idempotency-key'],
                user,
                reqMeta
            );

            // Emit socket event để cập nhật giao diện realtime
            try {
                const io = getIO();
                io.to(showtimeId).emit('seats:booked', {
                    showtimeId,
                    seatIds,
                    userId,
                });
            } catch (socketErr) {
                console.warn('Socket emit warning:', socketErr.message);
            }

            return res.status(201).json({
                message: 'Đặt vé thành công!',
                booking,
            });
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }

    async approveBooking(req, res) {
        try {
            const { id } = req.params;
            const approvedBooking = await bookingService.approveBooking(id);

            return res.status(200).json({
                message: 'Duyệt đơn vé thành công! Đã gửi thông báo và email xác nhận cho khách hàng.',
                booking: approvedBooking,
            });
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }

    async cancelBooking(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const userRole = req.user.role;

            const result = await bookingService.cancelBooking(id, userId, userRole);

            // Bắn realtime sự kiện ghế vừa được giải phóng
            try {
                const io = getIO();
                io.to(result.showtimeId).emit('seats:freed', {
                    showtimeId: result.showtimeId,
                    seatIds: result.seatIds,
                });

                io.emit('seat:freed', {
                    showtimeId: result.showtimeId,
                    seatLabels: result.seatLabels,
                    movieTitle: result.movieTitle,
                    startTime: result.startTime,
                    roomName: result.roomName,
                });
            } catch (socketErr) {
                console.warn('Socket emit warning:', socketErr.message);
            }

            return res.status(200).json({
                message: 'Hủy đơn đặt vé thành công!',
                cancelledBooking: result.cancelledBooking,
            });
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }

    async getBookings(req, res) {
        try {
            const userId = req.user.id;
            const isAdmin = req.user.role === 'ADMIN';
            const bookings = await bookingRepository.findAll(isAdmin ? null : userId, isAdmin);
            return res.status(200).json({ bookings });
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }

    async getMyBookings(req, res) {
        try {
            const userId = req.user.id;
            const bookings = await bookingRepository.findAll(userId, false);
            return res.status(200).json({ bookings });
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }

    async getAllBookings(req, res) {
        try {
            const bookings = await bookingRepository.findAll(null, true);
            return res.status(200).json({ bookings });
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }
}

module.exports = new BookingController();
