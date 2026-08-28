const voucherService = require("../services/voucher.service");

class VoucherController {
    async getAll(req, res) {
        try {
            const vouchers = await voucherService.getAllVouchers();
            return res.status(200).json({ success: true, vouchers });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async create(req, res) {
        try {
            const voucher = await voucherService.createVoucher(req.body);
            return res.status(201).json({ success: true, message: 'Tạo Voucher thành công!', voucher });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async delete(req, res) {
        try {
            const { id } = req.params;
            await voucherService.deleteVoucher(id);
            return res.status(200).json({ success: true, message: 'Xóa Voucher thành công!' });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async apply(req, res) {
        try {
            const { code, orderAmount } = req.body;
            const result = await voucherService.validateAndApply(code, Number(orderAmount));
            return res.status(200).json({ success: true, message: 'Áp dụng mã giảm giá thành công!', ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }
}

module.exports = new VoucherController();
