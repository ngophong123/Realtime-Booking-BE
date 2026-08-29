const express = require('express');
const settingController = require('../controllers/setting.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

const router = express.Router();

router.get('/email', authMiddleware, roleMiddleware(['ADMIN']), settingController.getEmailSettings);
router.put('/email', authMiddleware, roleMiddleware(['ADMIN']), settingController.updateEmailSettings);
router.post('/test-email', authMiddleware, roleMiddleware(['ADMIN']), settingController.testEmail);

module.exports = router;
