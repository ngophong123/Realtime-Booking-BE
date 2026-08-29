const showtimeRepository = require("../repositories/showtime.repository");
const movieRepository = require("../repositories/movie.repository");
const roomRepository = require("../repositories/room.repository");
const prisma = require("../config/prisma");

class ShowtimeService {
    async getAllShowtimes() {
        return await showtimeRepository.findAll();
    }

    async getShowtimeDetail(id) {
        const showtime = await showtimeRepository.findById(id);
        if (!showtime) {
            throw new Error('Không tìm thấy thông tin suất chiếu!');
        }

        const bookedSeats = await showtimeRepository.getBookedSeats(id);
        const bookedSeatIds = bookedSeats.map(b => b.seatId);

        const activeHolds = await showtimeRepository.getActiveHolds(id);
        const heldSeatIds = activeHolds.map(h => h.seatId);

        return {
            showtime,
            bookedSeatIds,
            heldSeatIds,
        };
    }

    async createShowtime(data) {
        const { movieId, roomId, startTime, endTime, price } = data;
        if (!movieId || !roomId || !startTime || !endTime || price === undefined) {
            throw new Error('Vui lòng điền đầy đủ thông tin: Phim, Phòng chiếu, Giờ chiếu và Giá vé!');
        }

        const start = new Date(startTime);
        const end = new Date(endTime);

        if (start >= end) {
            throw new Error('Thời gian bắt đầu phải trước thời gian kết thúc!');
        }

        const movie = await movieRepository.findById(movieId);
        if (!movie) {
            throw new Error('Bộ phim đã chọn không tồn tại!');
        }

        const room = await roomRepository.findById(roomId);
        if (!room) {
            throw new Error('Phòng chiếu đã chọn không tồn tại!');
        }

        const conflict = await showtimeRepository.findConflict(roomId, start, end);
        if (conflict) {
            throw new Error('Phòng chiếu đã có suất chiếu khác trong khoảng thời gian này!');
        }

        // Tự động chuyển trạng thái phim thành NOW_SHOWING (Đang chiếu)
        await prisma.movie.update({
            where: { id: movieId },
            data: { status: 'NOW_SHOWING' },
        });

        return await showtimeRepository.create({
            movieId,
            roomId,
            startTime: start,
            endTime: end,
            price: parseFloat(price),
        });
    }

    async updateShowtime(id, data) {
        const { movieId, roomId, startTime, endTime, price } = data;
        const start = new Date(startTime);
        const end = new Date(endTime);

        if (start >= end) {
            throw new Error('Thời gian bắt đầu phải trước thời gian kết thúc!');
        }

        const conflict = await showtimeRepository.findConflict(roomId, start, end, id);
        if (conflict) {
            throw new Error('Phòng chiếu đã có suất chiếu khác trong khoảng thời gian này!');
        }

        if (movieId) {
            await prisma.movie.update({
                where: { id: movieId },
                data: { status: 'NOW_SHOWING' },
            });
        }

        return await showtimeRepository.update(id, {
            movieId,
            roomId,
            startTime: start,
            endTime: end,
            price: parseFloat(price),
        });
    }

    async deleteShowtime(id) {
        return await showtimeRepository.delete(id);
    }
}

module.exports = new ShowtimeService();
