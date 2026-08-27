const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const userRepository = require('../repositories/user.repository');

class UserService {
    async register(name, email, password) {
        const existingUser = await userRepository.findByEmail(email);
        if (existingUser) {
            throw new Error('Email đã được sử dụng');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await userRepository.create({
            name,
            email,
            password: hashedPassword,
        });
         
        const { password: _, ...userWithoutPassword } = newUser;
        return userWithoutPassword;
    }

    async loginUser(email, password) {
        const user = await userRepository.findByEmail(email);
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
}

module.exports = new UserService();
