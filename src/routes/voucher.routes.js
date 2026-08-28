const express = require('express');
const voucherController = require('../controllers/voucher.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

const router = express.Router();

router.get('/', voucherController.getAll);
router.post('/apply', voucherController.apply);
router.post('/', authMiddleware, roleMiddleware(['ADMIN']), voucherController.create);
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN']), voucherController.delete);

module.exports = router;
