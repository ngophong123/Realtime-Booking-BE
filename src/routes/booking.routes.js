const express = require("express");
const bookingController = require("../controllers/booking.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.get('/', authMiddleware, bookingController.getAll);
router.post('/', authMiddleware, bookingController.create);
router.post('/:id/cancel', authMiddleware, bookingController.cancel);

module.exports = router;
