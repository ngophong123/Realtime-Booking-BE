const express = require('express');
const notificationController = require('../controllers/notification.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/', authMiddleware, notificationController.getAll);
router.put('/:id/read', authMiddleware, notificationController.markRead);
router.put('/read-all', authMiddleware, notificationController.markAllRead);

module.exports = router;
