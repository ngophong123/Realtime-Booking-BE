const prisma = require("../config/prisma");

class VoucherRepository {
    async findAll() {
        return await prisma.voucher.findMany({
            orderBy: { createdAt: 'desc' }
        });
    }

    async findByCode(code) {
        return await prisma.voucher.findUnique({
            where: { code: code.toUpperCase() }
        });
    }

    async create(voucherData) {
        return await prisma.voucher.create({
            data: {
                ...voucherData,
                code: voucherData.code.toUpperCase(),
            }
        });
    }

    async delete(id) {
        return await prisma.voucher.delete({
            where: { id }
        });
    }

    async update(id, data) {
        return await prisma.voucher.update({
            where: { id },
            data
        });
    }
}

module.exports = new VoucherRepository();
