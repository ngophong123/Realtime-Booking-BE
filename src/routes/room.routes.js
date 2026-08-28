const express = require('express');
const roomController = require('../controllers/room.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

const router = express.Router();

router.get('/', roomController.getAll);
router.get('/:id', roomController.getById);
router.post('/', authMiddleware, roleMiddleware(['ADMIN']), roomController.create);
router.put('/:id', authMiddleware, roleMiddleware(['ADMIN']), roomController.update);
router.put('/:id/seats', authMiddleware, roleMiddleware(['ADMIN']), roomController.updateSeats);
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN']), roomController.delete);

module.exports = router;
