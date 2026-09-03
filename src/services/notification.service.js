const prisma = require("../config/prisma");
const { getIO } = require("../config/socket");

class NotificationService {
    async createNotification({ userId = null, title, message, type = 'INFO' }) {
        const notif = await prisma.notification.create({
            data: {
                userId: userId || null,
                title,
                message,
                type,
            }
        });

        // Phát Socket Realtime tới User / Admin
        try {
            const io = getIO();
            if (userId) {
                io.emit(`notification:${userId}`, notif);
            } else {
                io.emit('notification:all', notif);
            }
        } catch (e) {
            console.error('Lỗi phát socket notification:', e.message);
        }

        return notif;
    }

    async getNotifications(userId, isAdmin = false) {
        if (isAdmin) {
            return await prisma.notification.findMany({
                orderBy: { createdAt: 'desc' },
                take: 50,
            });
        }

        return await prisma.notification.findMany({
            where: {
                OR: [
                    { userId: null },
                    { userId: userId }
                ]
            },
            orderBy: { createdAt: 'desc' },
            take: 30,
        });
    }

    async markAsRead(id) {
        return await prisma.notification.update({
            where: { id },
            data: { isRead: true }
        });
    }

    async markAllAsRead(userId, isAdmin = false) {
        if (isAdmin) {
            return await prisma.notification.updateMany({
                where: { isRead: false },
                data: { isRead: true }
            });
        }

        return await prisma.notification.updateMany({
            where: {
                isRead: false,
                OR: [{ userId: null }, { userId }]
            },
            data: { isRead: true }
        });
    }
}

module.exports = new NotificationService();
