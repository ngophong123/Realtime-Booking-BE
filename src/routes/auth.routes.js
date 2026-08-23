const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const userController = require("../controllers/user.controller");

const router = express.Router();

router.post( '/register', userController.register );
router.post( '/login', userController.login );
router.get( '/profile', authMiddleware, userController.getProfile );

module.exports = router;