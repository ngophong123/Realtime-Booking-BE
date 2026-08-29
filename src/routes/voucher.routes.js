const express = require('express');
const voucherController = require('../controllers/voucher.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

const router = express.Router();

router.get('/', voucherController.getAll);
router.get('/my-vouchers', authMiddleware, voucherController.getMyVouchers);
router.post('/apply', voucherController.apply);
router.post('/', authMiddleware, roleMiddleware(['ADMIN']), voucherController.create);
router.post('/gift', authMiddleware, roleMiddleware(['ADMIN']), voucherController.gift);
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN']), voucherController.delete);
router.delete('/:id/revoke', authMiddleware, roleMiddleware(['ADMIN']), voucherController.delete);

module.exports = router;
