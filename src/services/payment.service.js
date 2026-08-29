const prisma = require("../config/prisma");

class PaymentService {
    async getSettings() {
        let settings = await prisma.paymentSetting.findFirst();
        if (!settings) {
            settings = await prisma.paymentSetting.create({
                data: {
                    momoQrUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=MOMO_CINEVERSE_PREMIUM_PAYMENT',
                    vietQrUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=VIETQR_CINEVERSE_CINEMA_8888',
                    zaloPayQrUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=ZALOPAY_CINEVERSE_CINEMA',
                    bankAccountName: 'RAP PHIM CINEVERSE',
                    bankAccountNumber: '190368889999',
                    bankName: 'Techcombank',
                }
            });
        }
        return settings;
    }

    async updateSettings(data) {
        let settings = await prisma.paymentSetting.findFirst();
        if (!settings) {
            return await prisma.paymentSetting.create({
                data: {
                    momoQrUrl: data.momoQrUrl,
                    vietQrUrl: data.vietQrUrl,
                    zaloPayQrUrl: data.zaloPayQrUrl,
                    bankAccountName: data.bankAccountName || 'RAP PHIM CINEVERSE',
                    bankAccountNumber: data.bankAccountNumber || '190368889999',
                    bankName: data.bankName || 'Techcombank',
                }
            });
        }

        return await prisma.paymentSetting.update({
            where: { id: settings.id },
            data: {
                momoQrUrl: data.momoQrUrl !== undefined ? data.momoQrUrl : settings.momoQrUrl,
                vietQrUrl: data.vietQrUrl !== undefined ? data.vietQrUrl : settings.vietQrUrl,
                zaloPayQrUrl: data.zaloPayQrUrl !== undefined ? data.zaloPayQrUrl : settings.zaloPayQrUrl,
                bankAccountName: data.bankAccountName !== undefined ? data.bankAccountName : settings.bankAccountName,
                bankAccountNumber: data.bankAccountNumber !== undefined ? data.bankAccountNumber : settings.bankAccountNumber,
                bankName: data.bankName !== undefined ? data.bankName : settings.bankName,
            }
        });
    }
}

module.exports = new PaymentService();
