const prisma = require("../config/prisma");
const crypto = require("crypto");
const notificationService = require("./notification.service");
const emailService = require("./email.service");

class PaymentService {
    async getSettings() {
        let setting = await prisma.paymentSetting.findFirst();
        if (!setting) {
            setting = await prisma.paymentSetting.create({
                data: {
                    momoQrUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=2|99|0988889999|CINEVERSE%20CINEMA||0|0|100000|THANH%20TOAN%20VE%20XEM%20PHIM|transfer_p2p',
                    vietQrUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://img.vietqr.io/image/TCB-190388889999-compact2.png',
                    zaloPayQrUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=ZALOPAY_CINEVERSE_OFFICIAL',
                    bankAccountName: 'CONG TY CP RAP PHIM CINEVERSE',
                    bankAccountNumber: '190388889999',
                    bankName: 'Techcombank (Hội Sở)',
                }
            });
        }
        return setting;
    }

    async updateSettings(data) {
        const setting = await this.getSettings();
        return await prisma.paymentSetting.update({
            where: { id: setting.id },
            data: {
                momoQrUrl: data.momoQrUrl,
                vietQrUrl: data.vietQrUrl,
                zaloPayQrUrl: data.zaloPayQrUrl,
                bankAccountName: data.bankAccountName,
                bankAccountNumber: data.bankAccountNumber,
                bankName: data.bankName,
            }
        });
    }

    /**
     * 2. Tạo Payment Intent kèm chữ ký và Idempotency
     */
    async createPaymentIntent(bookingId, amount, paymentMethod, idempotencyKey) {
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: { showtime: { include: { movie: true } } },
        });

        if (!booking) {
            throw new Error('Không tìm thấy đơn hàng để thanh toán!');
        }

        const secret = process.env.PAYMENT_SECRET || process.env.JWT_SECRET || 'cineverse_pay_secret_2026';
        const signaturePayload = `${bookingId}|${amount}|${paymentMethod}|${booking.userId}`;
        const signature = crypto.createHmac('sha256', secret).update(signaturePayload).digest('hex');

        return {
            orderId: booking.id,
            amount: Number(booking.totalPrice),
            currency: 'VND',
            paymentMethod: paymentMethod || booking.paymentMethod,
            signature,
            idempotencyKey,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        };
    }

    /**
     * 3. XÁC THỰC WEBHOOK / IPN TỪ CỔNG THANH TOÁN (HMAC-SHA256)
     */
    async processWebhook(webhookData, rawSignature, reqMeta = {}) {
        const { orderId, bookingId, amount, currency = 'VND', transactionStatus, resultCode } = webhookData;
        const targetOrderId = orderId || bookingId;
        const secret = process.env.PAYMENT_SECRET || process.env.JWT_SECRET || 'cineverse_pay_secret_2026';

        // 1. Kiểm tra chữ ký HMAC
        const expectedSignature = crypto.createHmac('sha256', secret)
            .update(`${targetOrderId}|${amount}|${currency}`)
            .digest('hex');

        const isSignatureValid = rawSignature && (rawSignature === expectedSignature || rawSignature === webhookData.signature);

        if (!isSignatureValid) {
            console.warn(`🚨 [SECURITY ALERT] Webhook chữ ký không hợp lệ! OrderId: ${targetOrderId}`);
            await prisma.paymentLog.create({
                data: {
                    orderId: targetOrderId,
                    amount: amount ? Number(amount) : 0,
                    currency,
                    statusBefore: 'UNKNOWN',
                    statusAfter: 'REJECTED_INVALID_SIGNATURE',
                    signature: rawSignature || 'NONE',
                    isVerified: false,
                    rawPayload: JSON.stringify(webhookData),
                    ipAddress: reqMeta.ip || '0.0.0.0',
                    userAgent: reqMeta.userAgent || '',
                }
            }).catch(() => {});

            throw new Error('Chữ ký số webhook không hợp lệ (HMAC verification failed)!');
        }

        // 2. Tìm đơn hàng trong DB
        const booking = await prisma.booking.findUnique({
            where: { id: targetOrderId },
            include: {
                user: true,
                showtime: { include: { movie: true, room: true } },
                bookingSeats: { include: { seat: true } },
            },
        });

        if (!booking) {
            throw new Error(`Không tìm thấy đơn hàng #${targetOrderId} tương ứng với webhook!`);
        }

        // 3. Đối chiếu số tiền & tiền tệ
        const expectedAmount = Number(booking.totalPrice);
        const receivedAmount = Number(amount);

        if (Math.abs(expectedAmount - receivedAmount) > 0.01) {
            console.warn(`🚨 [SECURITY ALERT] Lệch số tiền thanh toán! Đơn hàng: ${expectedAmount}, Webhook: ${receivedAmount}`);
            await prisma.paymentLog.create({
                data: {
                    bookingId: booking.id,
                    userId: booking.userId,
                    orderId: booking.id,
                    amount: receivedAmount,
                    currency,
                    statusBefore: booking.status,
                    statusAfter: 'REJECTED_AMOUNT_MISMATCH',
                    isVerified: false,
                    rawPayload: JSON.stringify(webhookData),
                }
            }).catch(() => {});

            throw new Error(`Số tiền thanh toán không khớp với giá trị đơn hàng (${expectedAmount} != ${receivedAmount})!`);
        }

        // 4. State machine: Nếu đã CONFIRMED rồi thì trả kết quả thành công (Idempotent update)
        if (booking.status === 'CONFIRMED') {
            return {
                status: 'SUCCESS',
                message: 'Đơn hàng đã được xác nhận thanh toán trước đó (Idempotent OK).',
                booking,
            };
        }

        // 5. Cập nhật trạng thái thành công
        const isSuccess = transactionStatus === 'SUCCESS' || resultCode === 0 || resultCode === '00' || transactionStatus === '00' || !transactionStatus;

        const nextStatus = isSuccess ? 'CONFIRMED' : 'FAILED';
        const updatedBooking = await prisma.booking.update({
            where: { id: booking.id },
            data: { status: nextStatus },
            include: {
                user: true,
                showtime: { include: { movie: true, room: true } },
                bookingSeats: { include: { seat: true } },
            },
        });

        // 6. Ghi Audit log
        await prisma.paymentLog.create({
            data: {
                bookingId: booking.id,
                userId: booking.userId,
                orderId: booking.id,
                amount: expectedAmount,
                currency,
                statusBefore: booking.status,
                statusAfter: nextStatus,
                isVerified: true,
                rawPayload: JSON.stringify(webhookData),
                ipAddress: reqMeta.ip || '0.0.0.0',
                userAgent: reqMeta.userAgent || 'Payment Gateway Webhook',
            }
        }).catch(() => {});

        if (isSuccess) {
            const seatLabels = updatedBooking.bookingSeats?.map((s) => s.seat?.label || s.seatId);

            notificationService.createNotification({
                userId: updatedBooking.userId,
                title: '🎟️ THANH TOÁN THÀNH CÔNG QUA CỔNG SERVER!',
                message: `Đơn vé "${updatedBooking.showtime?.movie?.title}" đã được xác nhận thanh toán thành công!`,
                type: 'APPROVED',
            }).catch(() => {});

            emailService.sendUserTicketConfirmation({
                bookingId: updatedBooking.id,
                userName: updatedBooking.user?.name || 'Bạn',
                userEmail: updatedBooking.user?.email,
                movieTitle: updatedBooking.showtime?.movie?.title,
                roomName: updatedBooking.showtime?.room?.name,
                startTime: updatedBooking.showtime?.startTime,
                seatLabels,
                totalPrice: updatedBooking.totalPrice,
            }).catch(() => {});
        }

        return {
            status: isSuccess ? 'SUCCESS' : 'FAILED',
            message: `Xử lý webhook cho đơn #${booking.id} hoàn tất. Trạng thái mới: ${nextStatus}`,
            booking: updatedBooking,
        };
    }
}

module.exports = new PaymentService();
