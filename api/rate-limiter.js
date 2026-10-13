/**
 * Lightweight In-Memory Rate Limiting for Public Inquiries
 */

const memoryStore = new Map();

class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 10 * 60 * 1000; // 10 minutes
    this.maxRequests = options.maxRequests || 25; // max 25 per IP per 10 mins
  }

  checkPublicEndpoint(ip) {
    const now = Date.now();
    const key = `ip:${ip || 'unknown'}`;
    let record = memoryStore.get(key);

    if (!record || now > record.resetTime) {
      record = {
        attempts: 0,
        resetTime: now + this.windowMs
      };
      memoryStore.set(key, record);
    }

    record.attempts += 1;

    if (record.attempts > this.maxRequests) {
      const resetInSeconds = Math.ceil((record.resetTime - now) / 1000);
      return {
        allowed: false,
        retryAfter: resetInSeconds,
        reason: `Too many submissions. Please wait ${resetInSeconds} seconds before trying again.`
      };
    }

    return {
      allowed: true,
      remaining: this.maxRequests - record.attempts
    };
  }
}

module.exports = new RateLimiter();
