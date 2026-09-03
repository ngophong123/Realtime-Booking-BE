const express = require('express');
const router = express.Router();
const settingController = require('../controllers/setting.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

// Email Settings
router.get('/email', authMiddleware, roleMiddleware(['ADMIN']), settingController.getEmailSettings);
router.put('/email', authMiddleware, roleMiddleware(['ADMIN']), settingController.updateEmailSettings);
router.post('/test-email', authMiddleware, roleMiddleware(['ADMIN']), settingController.testEmail);

// Footer & Policy Settings (Công khai cho User xem, Admin mới được sửa)
router.get('/footer', settingController.getFooterSettings);
router.put('/footer', authMiddleware, roleMiddleware(['ADMIN']), settingController.updateFooterSettings);

module.exports = router;
