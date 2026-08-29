const voucherRepository = require("../repositories/voucher.repository");
const userRepository = require("../repositories/user.repository");
const emailService = require("./email.service");
const notificationService = require("./notification.service");

class VoucherService {
    async getAllVouchers() {
        return await voucherRepository.findAll();
    }

    async getUserVouchers(userId) {
        return await voucherRepository.findByUser(userId);
    }

    async createVoucher(data) {
        const { code, discountPercent, discountAmount, minOrderAmount, maxDiscount, expireAt, usageLimit, userId } = data;
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
            userId: userId || null,
        });
    }

    async giftVoucher(targetUserId, data) {
        if (!targetUserId) {
            throw new Error('Vui lòng chọn khách hàng nhận Voucher!');
        }

        const user = await userRepository.findById(targetUserId);
        if (!user) {
            throw new Error('Khách hàng được chọn không tồn tại!');
        }

        const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        const baseCode = data.code ? data.code.trim().toUpperCase() : 'GIFT';
        const code = `${baseCode}-${randomSuffix}`;

        const voucher = await voucherRepository.create({
            code,
            discountPercent: data.discountPercent ? Number(data.discountPercent) : null,
            discountAmount: data.discountAmount ? Number(data.discountAmount) : 50000,
            minOrderAmount: data.minOrderAmount ? Number(data.minOrderAmount) : 0,
            maxDiscount: data.maxDiscount ? Number(data.maxDiscount) : null,
            expireAt: data.expireAt ? new Date(data.expireAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            usageLimit: 1,
            userId: targetUserId,
        });

        // 1. Tạo Notification cho User
        const discountText = voucher.discountPercent ? `giảm ${voucher.discountPercent}%` : `giảm ${Number(voucher.discountAmount).toLocaleString('vi-VN')}đ`;
        await notificationService.createNotification({
            userId: targetUserId,
            title: '🎁 BẠN ĐƯỢC TẶNG VOUCHER MỚI!',
            message: `Ban quản trị vừa gửi tặng bạn mã Voucher "${code}" (${discountText}). Kiểm tra ngay trong Ví Voucher!`,
            type: 'VOUCHER',
        }).catch(err => console.error('Lỗi tạo notif voucher:', err.message));

        // 2. Gửi Email thông báo tặng quà
        emailService.sendVoucherGiftAlert({
            userEmail: user.email,
            userName: user.name,
            voucherCode: code,
            discountPercent: voucher.discountPercent,
            discountAmount: voucher.discountAmount,
            expireAt: voucher.expireAt,
        }).catch(err => console.error('Lỗi gửi email voucher:', err.message));

        return voucher;
    }

    async deleteVoucher(id) {
        return await voucherRepository.delete(id);
    }

    async validateAndApply(code, orderAmount, userId = null) {
        if (!code) {
            throw new Error('Vui lòng nhập mã Voucher!');
        }

        const voucher = await voucherRepository.findByCode(code);
        if (!voucher || !voucher.isActive) {
            throw new Error('Mã Voucher không tồn tại hoặc đã bị khóa!');
        }

        if (voucher.userId && userId && voucher.userId !== userId) {
            throw new Error('Mã Voucher này là quà tặng cá nhân dành riêng cho tài khoản khác!');
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
