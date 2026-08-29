const nodemailer = require("nodemailer");
const prisma = require("../config/prisma");

class EmailService {
    async getTransporter() {
        let setting = await prisma.emailSetting.findFirst();
        const user = setting?.smtpEmail || process.env.GMAIL_USER;
        const pass = setting?.smtpPassword || process.env.GMAIL_APP_PASSWORD;

        if (user && pass) {
            return {
                transporter: nodemailer.createTransport({
                    service: 'gmail',
                    auth: { user, pass },
                }),
                senderName: setting?.senderName || 'CINEVERSE Cinema',
                senderEmail: user,
                adminEmail: setting?.adminEmail || user,
            };
        }

        return null;
    }

    async sendEmail({ to, subject, html, text }) {
        try {
            const config = await this.getTransporter();
            if (config) {
                const info = await config.transporter.sendMail({
                    from: `"${config.senderName}" <${config.senderEmail}>`,
                    to,
                    subject,
                    text: text || '',
                    html,
                });
                console.log(`[EMAIL THẬT GỬI THÀNH CÔNG GMAIL] To: ${to} | ID: ${info.messageId}`);
                return { success: true, messageId: info.messageId };
            } else {
                console.log('\n[CHƯA CẤU HÌNH GMAIL] Log mô phỏng Email:');
                console.log(`To: ${to}`);
                console.log(`Subject: ${subject}`);
                console.log(`Nội dung: ${text || html?.replace(/<[^>]*>?/gm, '')}`);
                console.log('--------------------------------------------------\n');
                return { success: true, simulated: true };
            }
        } catch (error) {
            console.error('[LỖI GỬI EMAIL GMAIL]:', error.message);
            return { success: false, error: error.message };
        }
    }

    async sendAdminBookingAlert(data) {
        let setting = await prisma.emailSetting.findFirst();
        const adminTo = setting?.adminEmail || setting?.smtpEmail || process.env.GMAIL_USER || 'admin@cineverse.vn';

        const subject = `🔔 ĐƠN ĐẶT VÉ MỚI CẦN DUYỆT - #${data.bookingId?.slice(0, 8).toUpperCase()}`;
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; padding: 24px; border-radius: 16px; border: 1px solid #334155;">
                <h2 style="color: #00f2fe; margin-top: 0;">🎬 CINEVERSE - CÓ ĐƠN ĐẶT VÉ MỚI</h2>
                <p>Khách hàng vừa đặt vé và hoàn tất thanh toán. Vui lòng kiểm tra và duyệt vé:</p>
                <table style="width: 100%; border-collapse: collapse; margin: 16px 0; background: #1e293b; border-radius: 8px; overflow: hidden;">
                    <tr><td style="padding: 10px 14px; color: #94a3b8;">Mã Đơn:</td><td style="padding: 10px 14px; font-weight: bold; color: #00f2fe;">#${data.bookingId?.slice(0, 8).toUpperCase()}</td></tr>
                    <tr><td style="padding: 10px 14px; color: #94a3b8;">Khách Hàng:</td><td style="padding: 10px 14px; font-weight: bold;">${data.userName} (${data.userEmail})</td></tr>
                    <tr><td style="padding: 10px 14px; color: #94a3b8;">Phim:</td><td style="padding: 10px 14px; font-weight: bold; color: #fff;">${data.movieTitle}</td></tr>
                    <tr><td style="padding: 10px 14px; color: #94a3b8;">Phòng Chiếu:</td><td style="padding: 10px 14px;">${data.roomName}</td></tr>
                    <tr><td style="padding: 10px 14px; color: #94a3b8;">Giờ Chiếu:</td><td style="padding: 10px 14px; font-weight: bold; color: #ffd600;">${new Date(data.startTime).toLocaleString('vi-VN')}</td></tr>
                    <tr><td style="padding: 10px 14px; color: #94a3b8;">Vị Trí Ghế:</td><td style="padding: 10px 14px; font-weight: bold; color: #00f2fe;">${data.seatLabels?.join(', ')}</td></tr>
                    <tr><td style="padding: 10px 14px; color: #94a3b8;">Phương Thức:</td><td style="padding: 10px 14px;">${data.paymentMethod}</td></tr>
                    <tr><td style="padding: 10px 14px; color: #94a3b8;">Tổng Tiền:</td><td style="padding: 10px 14px; font-size: 18px; font-weight: bold; color: #00e676;">${Number(data.totalPrice).toLocaleString('vi-VN')}đ</td></tr>
                </table>
                <p style="color: #94a3b8; font-size: 13px;">Vui lòng truy cập trang Quản Trị Rạp (Admin Portal) để bấm <b>Duyệt Vé</b> cho khách hàng.</p>
            </div>
        `;

        return await this.sendEmail({ to: adminTo, subject, html });
    }

    async sendUserTicketConfirmation(data) {
        if (!data.userEmail) return;

        const subject = `🎟️ VÉ XEM PHIM CỦA BẠN ĐÃ ĐƯỢC DUYỆT - #${data.bookingId?.slice(0, 8).toUpperCase()}`;
        const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=CINEVERSE_TICKET_${data.bookingId}`;

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; padding: 28px; border-radius: 20px; border: 2px solid #00f2fe; box-shadow: 0 10px 30px rgba(0, 242, 254, 0.2);">
                <div style="text-align: center; border-bottom: 1px solid #334155; padding-bottom: 16px; margin-bottom: 20px;">
                    <h1 style="color: #00f2fe; margin: 0; font-size: 24px; letter-spacing: 2px;">CINEVERSE REALTIME CINEMA</h1>
                    <span style="font-size: 13px; color: #94a3b8; letter-spacing: 1px;">VÉ XEM PHIM ĐIỆN TỬ CHÍNH THỨC</span>
                </div>

                <p>Chào <b>${data.userName}</b>, đơn vé của bạn đã được quản trị viên duyệt thành công!</p>

                <div style="background: #1e293b; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px dashed #475569;">
                    <h2 style="color: #fff; margin: 0 0 12px; font-size: 20px;">${data.movieTitle}</h2>
                    <p style="margin: 6px 0; color: #cbd5e1;">📍 Phòng: <b style="color: #00f2fe;">${data.roomName}</b></p>
                    <p style="margin: 6px 0; color: #cbd5e1;">⏰ Suất chiếu: <b style="color: #ffd600;">${new Date(data.startTime).toLocaleString('vi-VN')}</b></p>
                    <p style="margin: 6px 0; color: #cbd5e1;">💺 Vị trí ghế: <b style="color: #00e676; font-size: 16px;">${data.seatLabels?.join(', ')}</b></p>
                    <p style="margin: 6px 0; color: #cbd5e1;">💳 Đã thanh toán: <b>${Number(data.totalPrice).toLocaleString('vi-VN')}đ</b></p>
                </div>

                <div style="text-align: center; margin: 24px 0;">
                    <p style="color: #94a3b8; font-size: 12px; margin-bottom: 8px;">QUÉT MÃ QR NÀY ĐỂ VÀO PHÒNG CHIẾU:</p>
                    <img src="${qrImgUrl}" alt="Mã QR Vé Vào Rạp" style="width: 160px; height: 160px; background: #fff; padding: 10px; border-radius: 12px;" />
                    <p style="font-size: 11px; color: #64748b; margin-top: 6px;">Mã vé: #${data.bookingId?.slice(0, 8).toUpperCase()}</p>
                </div>

                <p style="font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #334155; padding-top: 16px;">
                    Cảm ơn bạn đã lựa chọn CINEVERSE. Chúc bạn có những phút giây xem phim tuyệt vời!
                </p>
            </div>
        `;

        return await this.sendEmail({ to: data.userEmail, subject, html });
    }

    async sendVoucherGiftAlert(data) {
        if (!data.userEmail) return;

        const subject = `🎁 BẠN VỪA NHẬN ĐƯỢC VOUCHER QUÀ TẶNG TỪ CINEVERSE!`;
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; padding: 24px; border-radius: 16px; border: 1px solid #ffd600;">
                <h2 style="color: #ffd600; margin-top: 0;">🎁 QUÀ TẶNG DÀNH RIÊNG CHO BẠN</h2>
                <p>Chào <b>${data.userName}</b>, ban quản trị rạp CINEVERSE vừa gửi tặng bạn một mã Voucher giảm giá đặc biệt:</p>
                <div style="background: #1e293b; padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; border: 2px dashed #ffd600;">
                    <span style="font-size: 28px; font-weight: bold; color: #ffd600; letter-spacing: 2px;">${data.voucherCode}</span>
                    <p style="color: #00e676; font-size: 18px; font-weight: bold; margin: 10px 0 4px;">
                        ${data.discountPercent ? `Giảm ${data.discountPercent}%` : `Giảm ${Number(data.discountAmount).toLocaleString('vi-VN')}đ`}
                    </p>
                    <span style="color: #94a3b8; font-size: 12px;">Hạn sử dụng: ${new Date(data.expireAt).toLocaleDateString('vi-VN')}</span>
                </div>
                <p style="color: #cbd5e1; font-size: 13px;">Mã giảm giá đã được thêm tự động vào <b>"Ví Voucher Của Tôi"</b> trên website. Bạn có thể sử dụng ngay khi mua vé xem phim!</p>
            </div>
        `;

        return await this.sendEmail({ to: data.userEmail, subject, html });
    }

    async sendTestEmail(targetEmail) {
        return await this.sendEmail({
            to: targetEmail,
            subject: '✅ KIỂM TRA KẾT NỐI EMAIL CINEVERSE THÀNH CÔNG!',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; background: #0f172a; color: #fff; border-radius: 12px;">
                    <h2 style="color: #00e676;">Kết Nối Gmail SMTP Thành Công!</h2>
                    <p>Hệ thống gửi email của rạp CINEVERSE đã hoạt động hoàn hảo.</p>
                    <p style="color: #94a3b8; font-size: 12px;">Thời gian kiểm tra: ${new Date().toLocaleString('vi-VN')}</p>
                </div>
            `,
            text: 'Kết nối Gmail SMTP của CINEVERSE hoạt động thành công!',
        });
    }
}

module.exports = new EmailService();
