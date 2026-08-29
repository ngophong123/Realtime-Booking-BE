const prisma = require("../config/prisma");

class AIService {
    async getCinemaContext() {
        const [movies, showtimes, vouchers] = await Promise.all([
            prisma.movie.findMany({
                orderBy: { releaseDate: 'desc' }
            }),
            prisma.showtime.findMany({
                where: { startTime: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000) } },
                include: { movie: true, room: true },
                orderBy: { startTime: 'asc' },
                take: 15,
            }),
            prisma.voucher.findMany({
                where: { isActive: true, expireAt: { gt: new Date() }, userId: null },
                take: 10,
            }),
        ]);

        return {
            movies,
            showtimes,
            vouchers,
            policies: {
                cancellation: 'Khách hàng có thể hủy vé và giải phóng ghế trước giờ bắt đầu của suất chiếu ít nhất 12 tiếng. Dưới 12 tiếng không được hủy (trừ Admin).',
                seats: 'Ghế Thường (giá gốc), Ghế VIP (phụ thu +20.000đ, màu vàng Gold), Ghế Đôi/Couple (phụ thu +40.000đ, ghế rộng đôi màu hồng tím).',
                payments: 'Hỗ trợ Quét mã VietQR ngân hàng 24/7, Ví MoMo, Ví ZaloPay, Thẻ ATM/Visa nội địa.',
                approval: 'Sau khi thanh toán xong, đơn vé ở trạng thái Chờ Duyệt (PENDING). Quản trị viên duyệt vé thì vé điện tử ảo kèm mã QR sẽ gửi thẳng về Email của bạn và hiển thị trong mục "Vé Của Tôi".'
            }
        };
    }

    async chat(userMessage, conversationHistory = []) {
        const context = await this.getCinemaContext();
        const apiKey = process.env.GEMINI_API_KEY;

        // 1. Thử gọi Google Gemini API nếu có API key
        if (apiKey && apiKey.trim() !== '') {
            try {
                const response = await this.callGeminiAPI(apiKey, userMessage, context, conversationHistory);
                if (response) return response;
            } catch (e) {
                console.warn('Lỗi gọi Gemini API, chuyển sang Smart Fallback Engine:', e.message);
            }
        }

        // 2. Sử dụng Smart Rule-based NLP Retrieval Engine
        return this.smartFallbackEngine(userMessage, context);
    }

    async callGeminiAPI(apiKey, userMessage, context, conversationHistory) {
        const systemPrompt = `Bạn là "CINEVERSE AI Assistant" - Trợ lý ảo thông minh và thân thiện của Rạp chiếu phim CINEVERSE Realtime Cinema.
Dưới đây là thông tin thời gian thực của rạp:

DANH SÁCH PHIM HIỆN CÓ:
${context.movies.map(m => `- [${m.id}] ${m.title} (${m.duration} phút, Trạng thái: ${m.status === 'NOW_SHOWING' ? 'Đang Chiếu' : 'Sắp Chiếu'}, Mô tả: ${m.description || 'Hấp dẫn'})`).join('\n')}

LỊCH CHIẾU HÔM NAY VÀ SẮP TỚI:
${context.showtimes.map(s => `- Phim: "${s.movie.title}" | Phòng: ${s.room.name} (${s.room.type}) | Giờ: ${new Date(s.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })} - ${new Date(s.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })} ngày ${new Date(s.startTime).toLocaleDateString('vi-VN')} | Giá: ${Number(s.price).toLocaleString('vi-VN')}đ (ShowtimeID: ${s.id})`).join('\n')}

MÃ VOUCHER ĐANG KHẢ DỤNG:
${context.vouchers.map(v => `- Mã: ${v.code} (${v.discountPercent ? `Giảm ${v.discountPercent}%` : `Giảm ${Number(v.discountAmount).toLocaleString('vi-VN')}đ`}, Đơn tối thiểu: ${Number(v.minOrderAmount).toLocaleString('vi-VN')}đ, HSD: ${new Date(v.expireAt).toLocaleDateString('vi-VN')})`).join('\n')}

CHÍNH SÁCH RẠP:
- Hủy vé: ${context.policies.cancellation}
- Loại ghế: ${context.policies.seats}
- Thanh toán: ${context.policies.payments}
- Nhận vé: ${context.policies.approval}

HƯỚNG DẪN TRẢ LỜI:
- Trả lời bằng tiếng Việt, giọng điệu nhiệt tình, lịch sự, dùng emoji sinh động (🎬, 🍿, 🎟️, ✨).
- Khi người dùng hỏi về phim hoặc suất chiếu, hãy gợi ý cụ thể tên phim và khung giờ 24h.
- Đưa ra câu trả lời ngắn gọn, rõ ràng, định dạng markdown đẹp mắt.`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        const contents = [
            { role: 'user', parts: [{ text: systemPrompt }] },
            { role: 'model', parts: [{ text: 'Chào bạn! Mình là CINEVERSE AI Assistant. Mình đã nắm rõ toàn bộ thông tin phim, suất chiếu và ưu đãi của rạp CINEVERSE. Mình có thể giúp gì cho bạn hôm nay?' }] },
            ...conversationHistory.slice(-6).map(h => ({
                role: h.sender === 'user' ? 'user' : 'model',
                parts: [{ text: h.text }]
            })),
            { role: 'user', parts: [{ text: userMessage }] }
        ];

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents })
        });

        if (!res.ok) {
            throw new Error(`Gemini API returned status ${res.status}`);
        }

        const data = await res.json();
        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        // Match related movies to display action cards
        const suggestedMovies = context.movies.filter(m =>
            replyText?.toLowerCase().includes(m.title.toLowerCase()) ||
            userMessage.toLowerCase().includes(m.title.toLowerCase())
        ).slice(0, 3);

        return {
            reply: replyText || 'Rất tiếc, mình chưa hiểu ý bạn. Bạn có thể hỏi về danh sách phim, suất chiếu, voucher hoặc chính sách rạp nhé!',
            suggestedMovies,
        };
    }

    smartFallbackEngine(userMessage, context) {
        const query = userMessage.toLowerCase().trim();

        // 1. Chào hỏi
        if (/^(chào|hi|hello|alo|hey|ê|xin chào)/i.test(query)) {
            const nowShowing = context.movies.filter(m => m.status === 'NOW_SHOWING');
            return {
                reply: `👋 **Xin chào bạn! Mình là Trợ lý ảo CINEVERSE AI.**\n\nHiện tại rạp đang có **${nowShowing.length} bộ phim đang chiếu** và **${context.showtimes.length} suất chiếu** sẵn sàng phục vụ bạn hôm nay!\n\nBạn cần mình giúp gì nào? Gợi ý câu hỏi:\n- 🍿 *Phim nào đang hot nhất?*\n- ⏰ *Suất chiếu tối nay có gì?*\n- 🎁 *Mã giảm giá hôm nay*\n- 🛡️ *Chính sách hủy vé rạp*`,
                suggestedMovies: nowShowing.slice(0, 2),
            };
        }

        // 2. Hỏi về chính sách hủy vé
        if (query.includes('hủy') || query.includes('đổi vé') || query.includes('hoàn tiền') || query.includes('chính sách')) {
            return {
                reply: `🛡️ **Chính Sách Hủy Vé Tại CINEVERSE:**\n\n- **Điều kiện hủy:** Quý khách chỉ có thể hủy vé trước khi suất chiếu bắt đầu **ít nhất 12 tiếng**.\n- **Dưới 12 tiếng:** Hệ thống sẽ khóa nút hủy để đảm bảo quyền lợi lịch chiếu của rạp.\n- **Giải phóng ghế:** Khi hủy thành công, toàn bộ ghế đã đặt sẽ được mở lại cho khách khác và tiền sẽ được đối soát hoàn trả.\n- Để hủy vé, bạn chỉ cần vào mục **"Vé Của Tôi"** ở góc trên màn hình và bấm nút **"Hủy Vé"** nhé!`,
                suggestedMovies: [],
            };
        }

        // 3. Hỏi về Voucher / Khuyến mãi
        if (query.includes('voucher') || query.includes('khuyến mãi') || query.includes('giảm giá') || query.includes('code') || query.includes('sale') || query.includes('mã')) {
            if (context.vouchers.length === 0) {
                return {
                    reply: `🎁 Hiện tại các mã voucher chung đang tạm hết lượt, nhưng bạn hãy kiểm tra mục **"Ví Voucher Của Tôi"** (bấm vào Avatar của bạn) xem có được Ban quản trị tặng mã riêng không nhé!`,
                    suggestedMovies: [],
                };
            }

            const voucherList = context.vouchers.map(v =>
                `• **\`${v.code}\`**: ${v.discountPercent ? `Giảm **${v.discountPercent}%**` : `Giảm **${Number(v.discountAmount).toLocaleString('vi-VN')}đ**`} (Đơn tối thiểu ${Number(v.minOrderAmount).toLocaleString('vi-VN')}đ, HSD: ${new Date(v.expireAt).toLocaleDateString('vi-VN')})`
            ).join('\n');

            return {
                reply: `🎁 **Các Mã Voucher Giảm Giá Đang Hoạt Động:**\n\n${voucherList}\n\n💡 **Mẹo:** Khi chọn ghế và thanh toán, hệ thống sẽ hiện sẵn các thẻ voucher này để bạn click chọn nhanh mà không cần gõ mã!`,
                suggestedMovies: [],
            };
        }

        // 4. Hỏi về Giá vé / Ghế VIP / Ghế đôi Couple
        if (query.includes('giá') || query.includes('ghế') || query.includes('vip') || query.includes('couple') || query.includes('ghế đôi')) {
            return {
                reply: `💺 **Bảng Giá & Phân Loại Ghế Tại CINEVERSE:**\n\n- 🟦 **Ghế Thường (STANDARD):** Giá vé cơ bản của suất chiếu (từ 70k - 90k tùy phòng).\n- 🟨 **Ghế VIP:** Phụ thu **+20.000đ** (Vị trí trung tâm màn hình, góc nhìn sắc nét nhất).\n- 💖 **Ghế Đôi (COUPLE):** Phụ thu **+40.000đ** (Ghế bọc nhung đôi rộng rãi dành riêng cho 2 người ở hàng cuối).\n\n💳 **Phương thức thanh toán:** VietQR ngân hàng, MoMo, ZaloPay, Thẻ ATM.`,
                suggestedMovies: [],
            };
        }

        // 5. Hỏi về Suất chiếu / Giờ chiếu
        if (query.includes('suất chiếu') || query.includes('lịch chiếu') || query.includes('giờ') || query.includes('chiếu') || query.includes('tối nay') || query.includes('hôm nay')) {
            if (context.showtimes.length === 0) {
                return {
                    reply: `⏰ Hiện tại chưa có suất chiếu mới được lên lịch. Bạn vui lòng quay lại sau ít phút hoặc xem danh sách phim sắp chiếu nhé!`,
                    suggestedMovies: context.movies.slice(0, 2),
                };
            }

            const stList = context.showtimes.slice(0, 6).map(s =>
                `• **${s.movie.title}** lúc **${new Date(s.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })}** (${s.room.name}) - Giá: **${Number(s.price).toLocaleString('vi-VN')}đ**`
            ).join('\n');

            const matchedMovieIds = Array.from(new Set(context.showtimes.slice(0, 3).map(s => s.movieId)));
            const suggestedMovies = context.movies.filter(m => matchedMovieIds.includes(m.id));

            return {
                reply: `⏰ **Lịch Chiếu Phim Nổi Bật Hôm Nay (Khung Giờ 24h):**\n\n${stList}\n\n👉 Bạn có thể bấm trực tiếp vào phim bên dưới để chọn chỗ ngồi nhé!`,
                suggestedMovies,
            };
        }

        // 6. Tìm phim cụ thể theo tên hoặc thể loại
        const matchedMovies = context.movies.filter(m =>
            m.title.toLowerCase().includes(query) ||
            (m.description && m.description.toLowerCase().includes(query))
        );

        if (matchedMovies.length > 0) {
            const m = matchedMovies[0];
            const mShowtimes = context.showtimes.filter(s => s.movieId === m.id);
            const stText = mShowtimes.length > 0
                ? mShowtimes.map(s => `**${new Date(s.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })}** (${s.room.name})`).join(', ')
                : 'Chưa có lịch chiếu hôm nay';

            return {
                reply: `🎬 **Phim: ${m.title}**\n\n- **Thời lượng:** ${m.duration} phút\n- **Trạng thái:** ${m.status === 'NOW_SHOWING' ? '🔥 Đang Chiếu' : '⏳ Sắp Chiếu'}\n- **Lịch chiếu:** ${stText}\n- **Nội dung:** ${m.description || 'Trải nghiệm điện ảnh đỉnh cao tại Cineverse.'}`,
                suggestedMovies: [m],
            };
        }

        // 7. Mặc định: Gợi ý các phim đang chiếu
        const nowShowing = context.movies.filter(m => m.status === 'NOW_SHOWING');
        return {
            reply: `🍿 **Gợi Ý Phim Hay Tại Rạp CINEVERSE:**\n\nHãy khám phá các bộ phim hot đang chiếu bên dưới! Bạn có thể hỏi mình chi tiết về suất chiếu, giá vé, chính sách hủy vé hoặc mã voucher giảm giá nhé.`,
            suggestedMovies: nowShowing.length > 0 ? nowShowing.slice(0, 3) : context.movies.slice(0, 3),
        };
    }
}

module.exports = new AIService();
