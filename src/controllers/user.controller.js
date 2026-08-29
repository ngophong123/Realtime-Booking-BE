const userService = require("../services/user.service");

class UserController {
    async register(req, res) {
        try {
            const { name, email, password } = req.body;
            if (!name || !email || !password) {
                return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin' });
            }
            const user = await userService.register(name, email, password);
            return res.status(201).json({
                message: 'Đăng ký tài khoản thành công',
                user,
            });
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }

    async login(req, res) {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return res.status(400).json({ message: 'Vui lòng điền email và mật khẩu' });
            }
            const result = await userService.loginUser(email, password);
            return res.status(200).json({
                message: 'Đăng nhập thành công',
                ...result,
            });
        } catch (error) {
            return res.status(401).json({ message: error.message });
        }
    }

    async getProfile(req, res) {
        try {
            const user = await userService.getUserProfile(req.user.id);
            return res.status(200).json({ user });
        } catch (error) {
            return res.status(404).json({ message: error.message });
        }
    }

    async updateProfile(req, res) {
        try {
            const user = await userService.updateUserProfile(req.user.id, req.body);
            return res.status(200).json({ message: 'Cập nhật thông tin tài khoản thành công!', user });
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }

    async getAllUsers(req, res) {
        try {
            const users = await userService.getAllUsers();
            return res.status(200).json({ users });
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }
}

module.exports = new UserController();
