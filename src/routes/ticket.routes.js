const express = require("express");
const router = express.Router();
const ticketController = require("../controllers/ticket.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const adminMiddleware = require("../middlewares/admin.middleware");

// Lấy thông tin mã QR vé kèm token chữ ký số
router.get("/:bookingId/qr-token", authMiddleware, ticketController.getTicketQR);

// Quét / Soát vé tại quầy (Chỉ Admin / Soát vé)
router.post("/verify-checkin", authMiddleware, adminMiddleware, ticketController.verifyAndCheckIn);

module.exports = router;
