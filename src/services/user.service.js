const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const userRepository = require('../repositories/user.repository');

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
        if (data.name) updateData.name = data.name.trim();
        if (data.email && data.email !== user.email) {
            const cleanEmail = data.email.trim().toLowerCase();
            const existing = await userRepository.findByEmail(cleanEmail);
            if (existing && existing.id !== id) {
                throw new Error('Email này đã được tài khoản khác sử dụng!');
            }
            updateData.email = cleanEmail;
        }

        if (data.newPassword && data.newPassword.trim() !== '') {
            if (!data.currentPassword) {
                throw new Error('Vui lòng nhập mật khẩu hiện tại để đổi mật khẩu mới!');
            }
            const isMatch = await bcrypt.compare(data.currentPassword, user.password);
            if (!isMatch) {
                throw new Error('Mật khẩu hiện tại không chính xác!');
            }
            updateData.password = await bcrypt.hash(data.newPassword, 10);
        }

        const updatedUser = await userRepository.update(id, updateData);
        const { password: _, ...userWithoutPassword } = updatedUser;
        return userWithoutPassword;
    }

    async getAllUsers() {
        return await userRepository.findAll();
    }
}

module.exports = new UserService();
