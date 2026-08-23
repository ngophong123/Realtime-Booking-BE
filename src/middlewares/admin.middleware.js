const adminMiddleware = (req, res, next) => {
    if(req.user && req.user.role === 'ADMIN') {
        next();
    } else {
        return res.status(403).json({ message: 'Quyền truy cập bị từ chối! API này yêu cầu quyền Admin.'});
    }
};

module.exports = adminMiddleware;