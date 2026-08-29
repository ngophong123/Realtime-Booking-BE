const paymentService = require("../services/payment.service");

class PaymentController {
    async getSettings(req, res) {
        try {
            const settings = await paymentService.getSettings();
            return res.status(200).json({ settings });
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }

    async updateSettings(req, res) {
        try {
            const settings = await paymentService.updateSettings(req.body);
            return res.status(200).json({ message: 'Cập nhật cấu hình thanh toán thành công!', settings });
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }
}

module.exports = new PaymentController();
