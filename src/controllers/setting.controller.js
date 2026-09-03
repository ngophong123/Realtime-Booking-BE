const prisma = require("../config/prisma");
const emailService = require("../services/email.service");

class SettingController {
    // 1. Email Settings
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

    // 2. Footer & Policy Settings (Công khai cho khách xem, chỉ Admin mới được sửa)
    async getFooterSettings(req, res) {
        try {
            let footer = await prisma.footerSetting.findFirst();
            if (!footer) {
                footer = await prisma.footerSetting.create({
                    data: {
                        termsOfService: `1. ĐIỀU KHOẢN SỬ DỤNG DỊCH VỤ CINEVERSE\n- Khách hàng có trách nhiệm bảo mật thông tin tài khoản và vé điện tử của mình.\n- Vé đã mua được hỗ trợ hủy/đổi trước giờ chiếu tối thiểu 12 tiếng.\n- Khách hàng cần xuất trình mã QR vé điện tử tại quầy soát vé trước giờ chiếu 10 phút.\n- Nghiêm cấm mọi hành vi quay phim, chụp ảnh, truyền phát trực tiếp trong phòng chiếu phim.`,
                        privacyPolicy: `2. CHÍNH SÁCH BẢO MẬT THÔNG TIN\n- CINEVERSE cam kết bảo mật tuyệt đối mọi thông tin cá nhân (Họ tên, Email, Số điện thoại, Lịch sử mua vé) của khách hàng theo tiêu chuẩn an toàn dữ liệu.\n- Thông tin thanh toán (Số tài khoản, Mã QR) được mã hóa bảo mật SSL/TLS.\n- Chúng tôi không bao giờ chia sẻ dữ liệu của quý khách cho bất kỳ bên thứ ba nào vì mục đích thương mại.`,
                        customerCare: `3. CHĂM SÓC KHÁCH HÀNG & HỖ TRỢ 24/7\n- Tổng đài hỗ trợ khách hàng: 1900 8888 (8:00 - 23:00 hàng ngày)\n- Email tiếp nhận khiếu nại & hỗ trợ: support@cineverse.vn\n- Hỗ trợ đổi trả vé, xử lý sự cố thanh toán và giải đáp thắc mắc dịch vụ.`,
                        aboutUs: `CINEVERSE - Hệ thống rạp chiếu phim kỹ thuật số Realtime hàng đầu, mang đến trải nghiệm điện ảnh chuẩn quốc tế IMAX & VIP Gold Class.`,
                        hotline: '1900 8888',
                        email: 'support@cineverse.vn',
                        socialFacebook: 'https://facebook.com/cineverse',
                        socialYoutube: 'https://youtube.com/cineverse',
                        socialZalo: 'https://zalo.me/cineverse',
                    }
                });
            }
            return res.status(200).json({ footer });
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }

    async updateFooterSettings(req, res) {
        try {
            const { termsOfService, privacyPolicy, customerCare, aboutUs, hotline, email, socialFacebook, socialYoutube, socialZalo, cancellationCutoffHours } = req.body;
            let footer = await prisma.footerSetting.findFirst();

            if (!footer) {
                footer = await prisma.footerSetting.create({
                    data: {
                        termsOfService,
                        privacyPolicy,
                        customerCare,
                        aboutUs,
                        hotline: hotline || '1900 8888',
                        email: email || 'support@cineverse.vn',
                        socialFacebook,
                        socialYoutube,
                        socialZalo,
                        cancellationCutoffHours: cancellationCutoffHours !== undefined ? Number(cancellationCutoffHours) : 12,
                    }
                });
            } else {
                footer = await prisma.footerSetting.update({
                    where: { id: footer.id },
                    data: {
                        termsOfService: termsOfService !== undefined ? termsOfService : footer.termsOfService,
                        privacyPolicy: privacyPolicy !== undefined ? privacyPolicy : footer.privacyPolicy,
                        customerCare: customerCare !== undefined ? customerCare : footer.customerCare,
                        aboutUs: aboutUs !== undefined ? aboutUs : footer.aboutUs,
                        hotline: hotline !== undefined ? hotline : footer.hotline,
                        email: email !== undefined ? email : footer.email,
                        socialFacebook: socialFacebook !== undefined ? socialFacebook : footer.socialFacebook,
                        socialYoutube: socialYoutube !== undefined ? socialYoutube : footer.socialYoutube,
                        socialZalo: socialZalo !== undefined ? socialZalo : footer.socialZalo,
                        cancellationCutoffHours: cancellationCutoffHours !== undefined ? Number(cancellationCutoffHours) : footer.cancellationCutoffHours,
                    }
                });
            }

            return res.status(200).json({ message: 'Cập nhật chính sách & Footer thành công!', footer });
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }
}

module.exports = new SettingController();
