require('dotenv').config();
const Redis = require('ioredis');

let redis = null;

if (process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: false,
    });

    redis.on('connect', () => {
        console.log('✅ Redis Client đã kết nối thành công qua REDIS_URL!');
    });

    redis.on('error', (err) => {
        console.error('⚠️ Lỗi kết nối Redis:', err.message);
    });
} else {
    console.warn('⚠️ Biến REDIS_URL không tồn tại trong file .env');
}

module.exports = redis;
