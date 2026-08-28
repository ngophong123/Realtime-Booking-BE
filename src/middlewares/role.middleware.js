const roleMiddleware = (roles = []) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Vui lòng đăng nhập để tiếp tục!' });
        }
        if (roles.length > 0 && !roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Quyền truy cập bị từ chối! Yêu cầu quyền Admin.' });
        }
        next();
    };
};

module.exports = roleMiddleware;
