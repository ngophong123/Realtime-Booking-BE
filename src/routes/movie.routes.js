const express = require("express");
const movieController = require("../controllers/movie.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const adminMiddleware = require("../middlewares/admin.middleware");

const router = express.Router();

router.get('/', movieController.getAll);
router.get('/:id', movieController.getById);
router.post('/', authMiddleware, adminMiddleware, movieController.create);
router.put('/:id', authMiddleware, adminMiddleware, movieController.update);
router.delete('/:id', authMiddleware, adminMiddleware, movieController.delete);

module.exports = router; 