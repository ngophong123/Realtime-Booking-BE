const express = require('express');
const showtimeController = require('../controllers/showtime.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

const router = express.Router();

router.get('/', showtimeController.getAll);
router.get('/:id', showtimeController.getDetail);
router.post('/', authMiddleware, roleMiddleware(['ADMIN']), showtimeController.create);
router.put('/:id', authMiddleware, roleMiddleware(['ADMIN']), showtimeController.update);
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN']), showtimeController.delete);

module.exports = router;
