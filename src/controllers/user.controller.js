const userService = require('../services/user.service');

class UserController {
    async register(req, res) {
        try {
            const { name, email, password} = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({message: 'Vui lòng nhập đầy đủ họ tên, email và mật khẩu'})
        }

        const user = await userService.register(name, email, password);
        return res.status(201).json({
            message: 'Đăng ký tài khoản thành công',
            user
        });
            
        } catch (error) {
            console.error(error);
            return res.status(400).json({message: error.message});
        }
    }

    async login(req, res) {
        try {
            const {email, password} = req.body;
            if (!email || !password) {
                return res.status(400).json({ message: 'Vui lòng điền đầy đủ email và mật khẩu'});
            }

            const data = await userService.loginUser(email, password);
            return res.status(200).json({
                message: 'Đăng nhập thành công',
                ...data,
            });
        } catch (error) {
            return res.status(400).json({ message: error.message
            });
        }
    }

    async getProfile(req, res) {
        try {
            const userId = req.user.id;
            const user = await userService.getUserProfile(userId);
            return res.status(200).json({user});
        } catch (error) {
            return res.status(400).json({ message: error.message});
        }
        }
    }
module.exports = new UserController();