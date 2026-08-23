
const movieService = require('../services/movie.service');

class MovieController {
    async getAll(req, res) {
        try {
            const movies = await movieService.getAllMovies();
            return res.status(200).json({movies});
        } catch (error) {
            return res.status(500).json({ message: error.message});
        }
    }

    async getById(req, res) {
        try {
            const {id} = req.params;
            const movie = await movieService.getMovieById(id);
            return res.status(200).json({movie});
        } catch (error) {
            return res.status(404).json({ message: error.message});
        }
    }

    async create(req, res) {
        try {
            const { title, duration, releaseDate} = req.body;
            if (!title || !duration || !releaseDate) {
                return res.status(400).json({ message: 'Vui lòng điền tiêu đề, thời lượng và ngày phát hành!'})
            }

            const movie = await movieService.createMovie(req.body);
            return res.status(201).json({ 
                message: 'Thêm phim mới thành công!',
                movie
            });
        } catch (error) {
            return res.status(400).json({ message: error.message});
        }
    }

    async update(req, res) {
        try {
            const {id} = req.params;
            const movie = await movieService.updateMovie(id, req.body);
            return res.status(200).json({ message: 'Cập nhật thông tin phim thành công!', movie});
        } catch (error) {
            return res.status(400).json({ message: error.message});
        }
    }

    async delete(req, res) {
        try {
            const {id} = req.params;
            await movieService.deleteMovie(id);
            return res.status(200).json({ message: 'Xoá phim thành công!'});
        } catch (error) {
            return res.status(400).json({ message: error.message});
        }
    }
}

module.exports = new MovieController();