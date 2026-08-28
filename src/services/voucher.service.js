const voucherRepository = require("../repositories/voucher.repository");

class VoucherService {
    async getAllVouchers() {
        return await voucherRepository.findAll();
    }

    async createVoucher(data) {
        const { code, discountPercent, discountAmount, minOrderAmount, maxDiscount, expireAt, usageLimit } = data;
        if (!code) {
            throw new Error('Vui lòng nhập mã Voucher!');
        }

        const existing = await voucherRepository.findByCode(code);
        if (existing) {
            throw new Error('Mã Voucher này đã tồn tại trong hệ thống!');
        }

        return await voucherRepository.create({
            code,
            discountPercent: discountPercent ? Number(discountPercent) : null,
            discountAmount: discountAmount ? Number(discountAmount) : null,
            minOrderAmount: minOrderAmount ? Number(minOrderAmount) : 0,
            maxDiscount: maxDiscount ? Number(maxDiscount) : null,
            expireAt: expireAt ? new Date(expireAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            usageLimit: usageLimit ? Number(usageLimit) : 100,
        });
    }

    async deleteVoucher(id) {
        return await voucherRepository.delete(id);
    }

    async validateAndApply(code, orderAmount) {
        if (!code) {
            throw new Error('Vui lòng nhập mã Voucher!');
        }

        const voucher = await voucherRepository.findByCode(code);
        if (!voucher || !voucher.isActive) {
            throw new Error('Mã Voucher không tồn tại hoặc đã bị khóa!');
        }

        if (new Date(voucher.expireAt) < new Date()) {
            throw new Error('Mã Voucher đã hết hạn sử dụng!');
        }

        if (voucher.usedCount >= voucher.usageLimit) {
            throw new Error('Mã Voucher đã hết lượt sử dụng!');
        }

        if (orderAmount < Number(voucher.minOrderAmount)) {
            throw new Error(`Đơn hàng phải tối thiểu ${Number(voucher.minOrderAmount).toLocaleString('vi-VN')}đ để sử dụng mã này!`);
        }

        let discount = 0;
        if (voucher.discountPercent) {
            discount = (orderAmount * voucher.discountPercent) / 100;
            if (voucher.maxDiscount && discount > Number(voucher.maxDiscount)) {
                discount = Number(voucher.maxDiscount);
            }
        } else if (voucher.discountAmount) {
            discount = Number(voucher.discountAmount);
        }

        if (discount > orderAmount) {
            discount = orderAmount;
        }

        const finalAmount = Math.max(0, orderAmount - discount);

        return {
            voucher,
            discountAmount: discount,
            finalAmount,
        };
    }
}

module.exports = new VoucherService();
