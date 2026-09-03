const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/payment.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const adminMiddleware = require("../middlewares/admin.middleware");
const rateLimiter = require("../middlewares/rateLimiter.middleware");
const idempotencyMiddleware = require("../middlewares/idempotency.middleware");

// Cấu hình (Public xem để hiển thị QR, Admin sửa)
router.get("/settings", paymentController.getSettings);
router.put("/settings", authMiddleware, adminMiddleware, paymentController.updateSettings);

// Tạo Payment Intent (có Rate limiting & Idempotency)
router.post("/intent", authMiddleware, rateLimiter(15, 60), idempotencyMiddleware, paymentController.createPaymentIntent);

// Webhook / IPN Server-to-Server từ cổng thanh toán (Verify HMAC)
router.post("/webhook", rateLimiter(60, 60), paymentController.handleWebhook);

// Tra cứu Audit logs (Chỉ Admin)
router.get("/logs", authMiddleware, adminMiddleware, paymentController.getPaymentLogs);

module.exports = router;
