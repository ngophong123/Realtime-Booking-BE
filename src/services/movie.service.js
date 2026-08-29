const movieRepository = require("../repositories/movie.repository");
const prisma = require("../config/prisma");

class MovieService {
    async getAllMovies() {
        return await movieRepository.findAll();
    }

    async getMovieById(id) {
        const movie = await movieRepository.findById(id);
        if (!movie) {
            throw new Error('Không tìm thấy phim yêu cầu!');
        }
        return movie;
    }

    async getRecommendations(userId = null, mood = null) {
        const allMovies = await movieRepository.findAll();

        // 1. Phân loại theo Mood từ khóa
        const moodKeywords = {
            action: ['hành động', 'chiến đấu', 'phiêu lưu', 'sát thủ', 'hồi hộp', 'action', 'cuộc chiến'],
            romance: ['lãng mạn', 'tình yêu', 'hẹn hò', 'tình cảm', 'couple', 'yêu', 'ngọt ngào'],
            comedy: ['hài', 'hài hước', 'vui nhộn', 'cười', 'xả stress', 'comedy'],
            horror: ['kinh dị', 'ám ảnh', 'rùng rợn', 'ma', 'quỷ', 'bí ẩn', 'horror'],
            family: ['gia đình', 'hoạt hình', 'thiếu nhi', 'doraemon', 'hoạt họa', 'bạn bè', 'phiêu lưu'],
        };

        let recommended = [];

        if (mood && moodKeywords[mood]) {
            const keywords = moodKeywords[mood];
            recommended = allMovies.filter(m => {
                const text = `${m.title} ${m.description || ''}`.toLowerCase();
                return keywords.some(kw => text.includes(kw));
            });
        }

        // 2. Nếu User đã có lịch sử đặt vé -> Ưu tiên các phim liên quan
        if (userId && recommended.length < 4) {
            const userBookings = await prisma.booking.findMany({
                where: { userId, status: 'CONFIRMED' },
                include: { showtime: { include: { movie: true } } },
                take: 5,
            });

            const watchedMovieIds = userBookings.map(b => b.showtime?.movieId).filter(Boolean);
            const unwatchedMovies = allMovies.filter(m => !watchedMovieIds.includes(m.id));

            if (unwatchedMovies.length > 0) {
                recommended = [...recommended, ...unwatchedMovies];
            }
        }

        // 3. Fallback: Nếu không đủ -> Lấy các phim đang chiếu và sắp chiếu hot nhất
        if (recommended.length < 4) {
            const nowShowing = allMovies.filter(m => m.status === 'NOW_SHOWING');
            recommended = [...recommended, ...nowShowing, ...allMovies];
        }

        // Loại bỏ trùng lặp
        const uniqueMap = new Map();
        recommended.forEach(m => uniqueMap.set(m.id, m));

        return Array.from(uniqueMap.values()).slice(0, 6);
    }

    async getSimilarMovies(movieId) {
        const currentMovie = await movieRepository.findById(movieId);
        if (!currentMovie) return [];

        const allMovies = await movieRepository.findAll();
        const otherMovies = allMovies.filter(m => m.id !== movieId);

        // Simple text similarity based on title & description
        const words = (currentMovie.description || currentMovie.title).toLowerCase().split(/\s+/);
        const scored = otherMovies.map(m => {
            const targetText = `${m.title} ${m.description || ''}`.toLowerCase();
            let score = 0;
            words.forEach(w => {
                if (w.length > 3 && targetText.includes(w)) score += 1;
            });
            if (m.status === currentMovie.status) score += 2;
            return { movie: m, score };
        });

        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, 4).map(s => s.movie);
    }

    async createMovie(data) {
        const { title, description, duration, releaseDate, posterUrl, status } = data;
        if (!title || !duration || !releaseDate) {
            throw new Error('Tiêu đề, thời lượng và ngày khởi chiếu là bắt buộc!');
        }

        return await movieRepository.create({
            title,
            description,
            duration: parseInt(duration),
            releaseDate: new Date(releaseDate),
            posterUrl,
            status: status || 'NOW_SHOWING',
        });
    }

    async updateMovie(id, data) {
        const movie = await movieRepository.findById(id);
        if (!movie) {
            throw new Error('Không tìm thấy phim cần cập nhật!');
        }

        const updateData = {};
        if (data.title) updateData.title = data.title;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.duration) updateData.duration = parseInt(data.duration);
        if (data.releaseDate) updateData.releaseDate = new Date(data.releaseDate);
        if (data.posterUrl !== undefined) updateData.posterUrl = data.posterUrl;
        if (data.status) updateData.status = data.status;

        return await movieRepository.update(id, updateData);
    }

    async deleteMovie(id) {
        const movie = await movieRepository.findById(id);
        if (!movie) {
            throw new Error('Không tìm thấy phim cần xóa!');
        }
        return await movieRepository.delete(id);
    }
}

module.exports = new MovieService();
