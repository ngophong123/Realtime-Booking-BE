const redis = require('../config/redis');
const prisma = require('../config/prisma');

const idempotencyMiddleware = async (req, res, next) => {
  const idempotencyKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'] || req.body?.idempotencyKey;

  if (!idempotencyKey || req.method !== 'POST') {
    return next();
  }

  const cacheKey = `idempotency:${idempotencyKey}`;

  try {
    // 1. Check Redis Cache
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        console.log(`⚡ [IDEMPOTENCY] Trả lại kết quả giao dịch cũ cho key: ${idempotencyKey}`);
        return res.status(parsed.statusCode || 200).json(parsed.body);
      }
    }

    // 2. Check Database Record
    const dbRecord = await prisma.idempotencyRecord.findUnique({
      where: { key: idempotencyKey },
    });

    if (dbRecord && dbRecord.expireAt > new Date()) {
      console.log(`⚡ [IDEMPOTENCY] Trả lại kết quả DB cũ cho key: ${idempotencyKey}`);
      const body = JSON.parse(dbRecord.responseBody);
      return res.status(dbRecord.statusCode).json(body);
    }

    // 3. Intercept response to store result
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      // Store in background if successful or meaningful status
      if (res.statusCode >= 200 && res.statusCode < 500) {
        const payloadToSave = {
          statusCode: res.statusCode,
          body,
        };

        if (redis) {
          redis.set(cacheKey, JSON.stringify(payloadToSave), 'EX', 86400).catch(() => {});
        }

        const expireAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        prisma.idempotencyRecord.upsert({
          where: { key: idempotencyKey },
          create: {
            key: idempotencyKey,
            userId: req.user?.id || null,
            path: req.originalUrl,
            responseBody: JSON.stringify(body),
            statusCode: res.statusCode,
            expireAt,
          },
          update: {
            responseBody: JSON.stringify(body),
            statusCode: res.statusCode,
            expireAt,
          },
        }).catch((e) => console.error('Lỗi lưu IdempotencyRecord:', e.message));
      }

      return originalJson(body);
    };

    next();
  } catch (err) {
    console.error('Lỗi idempotency middleware:', err);
    next();
  }
};

module.exports = idempotencyMiddleware;
