const prisma = require("../config/prisma");

class MovieRepository {

    async findAll() {
        return await prisma.movie.findMany({
            orderBy: { releaseDate: 'desc'},
        });
    }

    async findById(id) {
        return await prisma.movie.findUnique({
            where: {id},
        });
    }

    async create(movieData) {
        return await prisma.movie.create({
            data: movieData,
        });
    }

    async update(id, movieData) {
        return await prisma.movie.update({
      where: {id},
      data: movieData
        });
    }

    async delete(id) {
        return await prisma.movie.delete({
            where: {id},
        });
    }
}

module.exports = new MovieRepository();