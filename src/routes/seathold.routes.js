const express = require("express");
const seatHoldController = require("../controllers/seathold.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.post('/', authMiddleware, seatHoldController.hold);
router.post('/release', authMiddleware, seatHoldController.release);

module.exports = router;