const express = require("express");
const bookingController = require("../controllers/booking.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.post('/', authMiddleware, bookingController.create);

module.exports = router;