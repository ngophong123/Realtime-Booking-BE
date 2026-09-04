const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const userRepository = require('../repositories/user.repository');
const notificationService = require('./notification.service');

class UserService {
    async register(name, email, password) {
        const cleanEmail = email.trim().toLowerCase();
        const existingUser = await userRepository.findByEmail(cleanEmail);
        if (existingUser) {
            throw new Error('Email đã được sử dụng');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await userRepository.create({
            name: name.trim(),
            email: cleanEmail,
            password: hashedPassword,
        });

        const secret = process.env.JWT_SECRET || 'ahihihaha123';
        const token = jwt.sign(
            { id: newUser.id, role: newUser.role },
            secret,
            { expiresIn: '1d' }
        );
         
        const { password: _, ...userWithoutPassword } = newUser;
        return {
            user: userWithoutPassword,
            token,
        };
    }

    async loginUser(email, password) {
        const cleanEmail = email.trim().toLowerCase();
        const user = await userRepository.findByEmail(cleanEmail);
        if (!user) {
            throw new Error('Email hoặc mật khẩu không chính xác');
        }

        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            throw new Error('Email hoặc mật khẩu không chính xác');
        }

        const secret = process.env.JWT_SECRET || 'ahihihaha123';
        const token = jwt.sign(
            { id: user.id, role: user.role },
            secret,
            { expiresIn: '1d' }
        );

        const { password: _, ...userWithoutPassword } = user;
        return {
            user: userWithoutPassword,
            token,
        };
    }

    async getUserProfile(id) {
        const user = await userRepository.findById(id);
        if (!user) {
            throw new Error('Không tìm thấy người dùng');
        }
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }

    async updateUserProfile(id, data) {
        const user = await userRepository.findById(id);
        if (!user) {
            throw new Error('Không tìm thấy người dùng!');
        }

        const updateData = {};
        if (data.name && data.name.trim() !== '') {
            updateData.name = data.name.trim();
        }

        if (data.email && data.email.trim() !== '') {
            const cleanEmail = data.email.trim().toLowerCase();
            if (cleanEmail !== user.email.toLowerCase()) {
                const existing = await userRepository.findByEmail(cleanEmail);
                if (existing && existing.id !== id) {
                    throw new Error('Email này đã được tài khoản khác sử dụng!');
                }
                updateData.email = cleanEmail;
            }
        }

        let isPasswordChanged = false;
        if (data.newPassword && data.newPassword.trim() !== '') {
            if (!data.currentPassword) {
                throw new Error('Vui lòng nhập mật khẩu hiện tại để đổi mật khẩu mới!');
            }
            const isMatch = await bcrypt.compare(data.currentPassword, user.password);
            if (!isMatch) {
                throw new Error('Mật khẩu hiện tại không chính xác!');
            }
            if (data.newPassword.trim().length < 6) {
                throw new Error('Mật khẩu mới phải có tối thiểu 6 ký tự!');
            }
            updateData.password = await bcrypt.hash(data.newPassword.trim(), 10);
            isPasswordChanged = true;
        }

        const updatedUser = await userRepository.update(id, updateData);

        // Tạo thông báo vào hộp thư & phát socket realtime
        const updateDetailText = isPasswordChanged
            ? 'Bạn vừa cập nhật thông tin hồ sơ và thay đổi mật khẩu thành công.'
            : 'Thông tin tài khoản của bạn đã được lưu và cập nhật thành công.';

        notificationService.createNotification({
            userId: id,
            title: '👤 CẬP NHẬT TÀI KHOẢN THÀNH CÔNG',
            message: updateDetailText,
            type: 'SYSTEM',
        }).catch(() => {});

        const { password: _, ...userWithoutPassword } = updatedUser;
        return userWithoutPassword;
    }

    async getAllUsers() {
        return await userRepository.findAll();
    }
}

module.exports = new UserService();
