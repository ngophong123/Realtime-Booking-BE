const movieService = require("../services/movie.service");

class MovieController {
    async getAllMovies(req, res) {
        try {
            const movies = await movieService.getAllMovies();
            return res.status(200).json({ movies });
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }

    async getRecommendations(req, res) {
        try {
            const { mood } = req.query;
            const userId = req.user ? req.user.id : null;
            const recommendations = await movieService.getRecommendations(userId, mood);
            return res.status(200).json({ recommendations });
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }

    async getSimilarMovies(req, res) {
        try {
            const { id } = req.params;
            const similar = await movieService.getSimilarMovies(id);
            return res.status(200).json({ similar });
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }

    async getMovieById(req, res) {
        try {
            const { id } = req.params;
            const movie = await movieService.getMovieById(id);
            return res.status(200).json({ movie });
        } catch (error) {
            return res.status(404).json({ message: error.message });
        }
    }

    async createMovie(req, res) {
        try {
            const movie = await movieService.createMovie(req.body);
            return res.status(201).json({ message: 'Tạo phim thành công!', movie });
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }

    async updateMovie(req, res) {
        try {
            const { id } = req.params;
            const movie = await movieService.updateMovie(id, req.body);
            return res.status(200).json({ message: 'Cập nhật phim thành công!', movie });
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }

    async deleteMovie(req, res) {
        try {
            const { id } = req.params;
            await movieService.deleteMovie(id);
            return res.status(200).json({ message: 'Xóa phim thành công!' });
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }
}

module.exports = new MovieController();
