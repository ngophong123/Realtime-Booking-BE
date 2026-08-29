const prisma = require("../config/prisma");
const emailService = require("../services/email.service");

class SettingController {
    async getEmailSettings(req, res) {
        try {
            let setting = await prisma.emailSetting.findFirst();
            if (!setting) {
                setting = await prisma.emailSetting.create({
                    data: {
                        smtpEmail: process.env.GMAIL_USER || '',
                        smtpPassword: process.env.GMAIL_APP_PASSWORD || '',
                        senderName: 'CINEVERSE Cinema',
                        adminEmail: process.env.GMAIL_USER || 'admin@cineverse.vn',
                    }
                });
            }
            return res.status(200).json({ setting });
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }

    async updateEmailSettings(req, res) {
        try {
            const { smtpEmail, smtpPassword, senderName, adminEmail } = req.body;
            let setting = await prisma.emailSetting.findFirst();

            if (!setting) {
                setting = await prisma.emailSetting.create({
                    data: {
                        smtpEmail,
                        smtpPassword,
                        senderName: senderName || 'CINEVERSE Cinema',
                        adminEmail: adminEmail || smtpEmail,
                    }
                });
            } else {
                setting = await prisma.emailSetting.update({
                    where: { id: setting.id },
                    data: {
                        smtpEmail: smtpEmail !== undefined ? smtpEmail : setting.smtpEmail,
                        smtpPassword: smtpPassword !== undefined ? smtpPassword : setting.smtpPassword,
                        senderName: senderName !== undefined ? senderName : setting.senderName,
                        adminEmail: adminEmail !== undefined ? adminEmail : setting.adminEmail,
                    }
                });
            }

            return res.status(200).json({ message: 'Cập nhật cấu hình Email thành công!', setting });
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }

    async testEmail(req, res) {
        try {
            const { targetEmail } = req.body;
            const toEmail = targetEmail || req.user.email;
            if (!toEmail) {
                return res.status(400).json({ message: 'Vui lòng cung cấp email nhận thư kiểm tra!' });
            }

            const result = await emailService.sendTestEmail(toEmail);
            if (result.success) {
                return res.status(200).json({ message: `Đã gửi email kiểm tra thành công tới ${toEmail}!` });
            } else {
                return res.status(500).json({ message: `Lỗi gửi email: ${result.error}` });
            }
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }
}

module.exports = new SettingController();
