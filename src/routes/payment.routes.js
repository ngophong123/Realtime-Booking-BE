const express = require('express');
const paymentController = require('../controllers/payment.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

const router = express.Router();

router.get('/settings', paymentController.getSettings);
router.put('/settings', authMiddleware, roleMiddleware(['ADMIN']), paymentController.updateSettings);

module.exports = router;
