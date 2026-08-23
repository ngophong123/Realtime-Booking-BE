const express = require("express");
const roomController = require("../controllers/room.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const adminMiddleware = require("../middlewares/admin.middleware");

const router = express.Router();

router.get('/', roomController.getAll);
router.post('/', authMiddleware, adminMiddleware, roomController.create);

module.exports = router;