const paymentService = require("../services/payment.service");
const prisma = require("../config/prisma");

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

    async createPaymentIntent(req, res) {
        try {
            const { bookingId, amount, paymentMethod, idempotencyKey } = req.body;
            const intent = await paymentService.createPaymentIntent(bookingId, amount, paymentMethod, idempotencyKey);
            return res.status(200).json({ intent });
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }

    async handleWebhook(req, res) {
        try {
            const rawSignature = req.headers['x-signature'] || req.headers['x-webhook-signature'] || req.body.signature;
            const reqMeta = {
                ip: req.ip || req.connection.remoteAddress,
                userAgent: req.headers['user-agent'] || '',
            };

            const result = await paymentService.processWebhook(req.body, rawSignature, reqMeta);
            return res.status(200).json(result);
        } catch (error) {
            console.error('Lỗi xử lý webhook:', error.message);
            return res.status(400).json({
                status: 'ERROR',
                message: error.message,
            });
        }
    }

    async getPaymentLogs(req, res) {
        try {
            const logs = await prisma.paymentLog.findMany({
                orderBy: { createdAt: 'desc' },
                take: 100,
                include: {
                    user: { select: { id: true, name: true, email: true } },
                    booking: {
                        include: {
                            showtime: { include: { movie: true } }
                        }
                    }
                }
            });
            return res.status(200).json({ logs });
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }
}

module.exports = new PaymentController();
