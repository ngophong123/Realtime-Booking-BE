const express = require("express");
const showtimeController = require("../controllers/showtime.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const adminMiddleware = require("../middlewares/admin.middleware");

const router = express.Router();

router.get('/', showtimeController.getAll);
router.get('/:id', showtimeController.getById);
router.get('/:id/seats', showtimeController.getSeatMap);
router.post('/', authMiddleware, adminMiddleware, showtimeController.create);

module.exports = router;