const redis = require('../config/redis');

// In-memory fallback
const memoryHits = new Map();

/**
 * Velocity & Rate Limiter for Booking & Payment
 * @param {number} maxRequests - Max requests allowed in window
 * @param {number} windowSeconds - Time window in seconds
 */
const rateLimiter = (maxRequests = 10, windowSeconds = 60) => {
  return async (req, res, next) => {
    const identifier = req.user?.id || req.ip || req.connection.remoteAddress || 'unknown-client';
    const key = `ratelimit:${identifier}:${req.baseUrl || ''}${req.path}`;

    try {
      if (redis) {
        const count = await redis.incr(key);
        if (count === 1) {
          await redis.expire(key, windowSeconds);
        }

        if (count > maxRequests) {
          console.warn(`🚨 [ANTI-FRAUD] Phát hiện tần suất thao tác bất thường từ: ${identifier} (${count} reqs/${windowSeconds}s)`);
          return res.status(429).json({
            message: 'Hệ thống phát hiện thao tác quá nhanh hoặc bất thường. Vui lòng chờ 1 phút trước khi thử lại!',
            code: 'RATE_LIMIT_EXCEEDED',
          });
        }
      } else {
        const now = Date.now();
        const clientData = memoryHits.get(key) || { count: 0, resetAt: now + windowSeconds * 1000 };

        if (now > clientData.resetAt) {
          clientData.count = 1;
          clientData.resetAt = now + windowSeconds * 1000;
        } else {
          clientData.count += 1;
        }

        memoryHits.set(key, clientData);

        if (clientData.count > maxRequests) {
          console.warn(`🚨 [ANTI-FRAUD] Cảnh báo velocity từ IP: ${identifier}`);
          return res.status(429).json({
            message: 'Hệ thống phát hiện thao tác quá nhanh. Vui lòng chờ 1 phút!',
            code: 'RATE_LIMIT_EXCEEDED',
          });
        }
      }

      next();
    } catch (err) {
      console.error('Lỗi rateLimiter:', err.message);
      next();
    }
  };
};

module.exports = rateLimiter;
