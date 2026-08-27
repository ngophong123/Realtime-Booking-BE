const showtimeRepository = require("../repositories/showtime.repository");
const movieRepository = require("../repositories/movie.repository");
const roomRepository = require("../repositories/room.repository");
const seatHoldRepository = require("../repositories/seathold.repository");

class ShowtimeService {

    async getAllShowtimes() {
        return await showtimeRepository.findAll();
    }

    async getShowtimeById(id) {
        const showtime = await showtimeRepository.findById(id);
        if (!showtime) {
            throw new Error('Không tìm thấy suất chiếu yêu cầu!');
        }
        return showtime;
    }

    async deleteShowtime(id) {
        const showtime = await showtimeRepository.findById(id);
        if (!showtime) {
            throw new Error('Không tìm thấy suất chiếu cần xóa!');
        }
        return await showtimeRepository.delete(id);
    }

    async createShowtime(showtimeData) {
        const { movieId, roomId, startTime, endTime, price } = showtimeData;

        if (!movieId || !roomId || !startTime || !endTime || !price) {
            throw new Error('Vui lòng điền đầy đủ movieId, roomId, startTime, endTime, price');
        }

        if (price <= 0) {
            throw new Error('Giá vé phải lớn hơn 0đ!');
        }

        const start = new Date(startTime);
        const end = new Date(endTime);

        if (start >= end) {
            throw new Error('Thời gian bắt đầu suất chiếu phải trước thời gian kết thúc!');
        }

        const movie = await movieRepository.findById(movieId);
        if (!movie) {
            throw new Error('Không tìm thấy phim với ID đã cung cấp!');
        }

        const room = await roomRepository.findById(roomId);
        if (!room) {
            throw new Error('Không tìm thấy phòng chiếu với ID đã cung cấp!');
        }

        const conflict = await showtimeRepository.findConflict(roomId, start, end);
        if (conflict) {
            throw new Error('Phòng chiếu này đã có suất chiếu bị trùng thời gian!');
        }

        const formattedData = {
            movieId,
            roomId,
            startTime: start,
            endTime: end,
            price: parseFloat(price),
        };

        return await showtimeRepository.create(formattedData);
    }

    async getShowtimeSeatMap(showtimeId, currentUserId = null) {
        await seatHoldRepository.deleteExpireHolds();

        const showtime = await showtimeRepository.findById(showtimeId);
        if (!showtime) {
            throw new Error('Không tìm thấy suất chiếu yêu cầu!');
        }

        const [bookedSeats, activeHolds] = await Promise.all([
            showtimeRepository.getBookedSeats(showtimeId),
            showtimeRepository.getActiveHolds(showtimeId),
        ]);

        const bookedSeatIds = new Set(bookedSeats.map((b) => b.seatId));
        const holdMap = new Map();
        activeHolds.forEach((h) => holdMap.set(h.seatId, h.userId));
        
        const basePrice = parseFloat(showtime.price);

        const seats = showtime.room.seats.map((seat) => {
            let price = basePrice;
            switch (seat.type) {
                case 'VIP':
                    price += 20000;
                    break;
                case 'COUPLE':
                    price += 40000;
                    break;
                default:
                    break;
            }

            let status = 'AVAILABLE';
            let isMine = false;

            if (bookedSeatIds.has(seat.id)) {
                status = 'BOOKED';
            } else if (holdMap.has(seat.id)) {
                status = 'HOLDING';
                const holdingUserId = holdMap.get(seat.id);
                if (currentUserId && holdingUserId === currentUserId) {
                    isMine = true;
                }
            }

            return {
                id: seat.id,
                row: seat.row,
                column: seat.column,
                label: seat.label,
                type: seat.type,
                price,
                status,
                isMine,
            };
        });

        return {
            showtime: {
                id: showtime.id,
                startTime: showtime.startTime,
                endTime: showtime.endTime,
                basePrice,
                movie: showtime.movie,
                room: {
                    id: showtime.room.id,
                    name: showtime.room.name,
                    rows: showtime.room.rows,
                    columns: showtime.room.columns,
                    totalSeats: showtime.room.seats.length,
                },
            },
            seats,
        };
    }
}

module.exports = new ShowtimeService();
