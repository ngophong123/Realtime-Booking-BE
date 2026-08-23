const prisma = require('../config/prisma');

class UserRepository {

    async findByEmail(email) {
        return await prisma.user.findUnique({
            where: {email}
        });
    }

    async create(userData) {
        return await prisma.user.create({
            data: userData,
        });
    }

async findById(id) {
    return await prisma.user.findUnique({
        where: {id},
    });
}
 
}
module.exports = new UserRepository();
