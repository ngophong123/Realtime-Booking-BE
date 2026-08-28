const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const authRoutes = require("./routes/auth.routes");
const movieRoutes = require("./routes/movie.routes");
const roomRoutes = require("./routes/room.routes");
const showtimeRoutes = require("./routes/showtime.routes");
const bookingRoutes = require("./routes/booking.routes");
const seatHoldRoutes = require("./routes/seathold.routes");
const voucherRoutes = require("./routes/voucher.routes");

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.get('/', (req, res) => {
    res.json({ message: 'Chào mừng đến với realtime-booking-system API' });
});
app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/showtimes', showtimeRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/seathold', seatHoldRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use((req, res, next) => {
    res.status(404).json({ message: 'Đường dẫn API không tồn tại' });
});

module.exports = app;
