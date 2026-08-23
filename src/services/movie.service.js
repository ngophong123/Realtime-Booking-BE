const movieRepository = require("../repositories/movie.repository");
const MovieRepository = require("../repositories/movie.repository");

class MovieService {

    async getAllMovies() {
        return await movieRepository.findAll();
    }

    async getMovieById(id) {
        const movie = await movieRepository.findById(id);
        if(!movie) {
            throw new Error('Không tìm thấy phim yêu cầu!');
        }
        return movie;
    }

    async createMovie(movieData) {
        const { title, description, duration, releaseDate, posterUrl } = movieData;
        if (duration <= 0) {
            throw new Error('Thời lượng phim phải lớn hơn 0 phút!');
        }

        const formattedData = {
            title,
            description,
            duration: parseInt(duration),
            releaseDate: new Date(releaseDate),
            posterUrl
        };

        return await movieRepository.create(formattedData);
    }

    async updateMovie(id, movieData) {
        const existingMovie = await movieRepository.findById(id);
        if(!existingMovie) {
            throw new Error('Không tìm thấy phim cần cập nhật!');
        }
        
        const updateData = {};
        if (movieData.title) updateData.title = movieData.title;
        if (movieData.description !== undefined)
            updateData.description = movieData.description;
        if (movieData.posterUrl !== undefined)
            updateData.posterUrl = movieData.posterUrl;

        if (movieData.duration) {
            if (movieData.duration <= 0)
                throw new Error('Thời lượng phim phải lớn hơn 0 phút!');
            updateData.duration = parseInt(movieData.duration);
        }
        if (movieData.releaseDate) {
            updateData.releaseDate = new Date(movieData.releaseDate);
        }

        return await movieRepository.update(id, updateData);
    }

    async deleteMovie(id) {
        const existingMovie = await movieRepository.findById(id);
        if(!existingMovie) {
            throw new Error('Không tìm thấy phim cần xoá!')
        }
        return await movieRepository.delete(id);
    }
}
 
module.exports = new MovieService();