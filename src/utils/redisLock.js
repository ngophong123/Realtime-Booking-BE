const redis = require('../config/redis');
const crypto = require('crypto');

/**
 * Acquire distributed lock using Redis SET key value NX PX ttl
 * @param {string} resourceKey - e.g. "lock:seat:showtimeId:seatId"
 * @param {number} ttlMs - TTL in milliseconds (default 5000ms)
 * @returns {Promise<string|null>} lockValue if acquired, null if failed
 */
async function acquireLock(resourceKey, ttlMs = 5000) {
  if (!redis) return 'fallback-lock-' + Date.now();
  const lockValue = crypto.randomUUID();
  try {
    const result = await redis.set(resourceKey, lockValue, 'PX', ttlMs, 'NX');
    if (result === 'OK') {
      return lockValue;
    }
    return null;
  } catch (err) {
    console.error('Lỗi khi acquireLock Redis:', err.message);
    return null;
  }
}

/**
 * Release lock using Lua script to guarantee only the owner releases their lock
 * @param {string} resourceKey
 * @param {string} lockValue
 */
async function releaseLock(resourceKey, lockValue) {
  if (!redis || !lockValue || lockValue.startsWith('fallback-lock')) return;
  const luaScript = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;
  try {
    await redis.eval(luaScript, 1, resourceKey, lockValue);
  } catch (err) {
    console.error('Lỗi khi releaseLock Redis:', err.message);
  }
}

module.exports = { acquireLock, releaseLock };
