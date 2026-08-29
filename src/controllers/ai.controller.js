const aiService = require("../services/ai.service");

class AIController {
    async chat(req, res) {
        try {
            const { message, history } = req.body;
            if (!message || message.trim() === '') {
                return res.status(400).json({ message: 'Vui lòng nhập tin nhắn!' });
            }

            const result = await aiService.chat(message, history || []);
            return res.status(200).json(result);
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }
}

module.exports = new AIController();
