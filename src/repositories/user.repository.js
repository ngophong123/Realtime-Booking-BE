const prisma = require('../config/prisma');

class UserRepository {
    async findByEmail(email) {
        return await prisma.user.findUnique({
            where: { email }
        });
    }

    async create(userData) {
        return await prisma.user.create({
            data: userData,
        });
    }

    async findById(id) {
        return await prisma.user.findUnique({
            where: { id },
        });
    }

    async findAll() {
        return await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async update(id, data) {
        return await prisma.user.update({
            where: { id },
            data,
        });
    }
}

module.exports = new UserRepository();
