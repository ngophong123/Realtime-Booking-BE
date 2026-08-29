const notificationService = require("../services/notification.service");

class NotificationController {
    async getAll(req, res) {
        try {
            const isAdmin = req.user.role === 'ADMIN';
            const notifications = await notificationService.getNotifications(req.user.id, isAdmin);
            return res.status(200).json({ notifications });
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }

    async markRead(req, res) {
        try {
            const { id } = req.params;
            const notif = await notificationService.markAsRead(id);
            return res.status(200).json({ notification: notif });
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }

    async markAllRead(req, res) {
        try {
            const isAdmin = req.user.role === 'ADMIN';
            await notificationService.markAllAsRead(req.user.id, isAdmin);
            return res.status(200).json({ message: 'Đã đánh dấu tất cả là đã đọc!' });
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }
}

module.exports = new NotificationController();
