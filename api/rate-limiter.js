/**
 * Endpoint-Tiered Enterprise Rate Limiting Engine
 * 
 * Features:
 * 1. Strict Auth Limiters with Dual IP + Account Tracking
 * 2. Exponential Backoff on failed attempts (no arbitrary hard permanent lockouts)
 * 3. Moderate Public Endpoint Limits (Prevent spam/DDoS)
 * 4. Looser Authenticated User Limits
 * 5. 100% Configurable Thresholds via Environment Variables or constructor options
 */

// Global in-memory sliding window cache (Edge/Serverless compliant)
const memoryStore = new Map();

class TieredRateLimiter {
  constructor(options = {}) {
    // Configurable thresholds with production-safe fallbacks
    this.authWindowMs = parseInt(process.env.AUTH_LIMIT_WINDOW_MS || options.authWindowMs || 15 * 60 * 1000, 10);
    this.authMaxAttempts = parseInt(process.env.AUTH_MAX_ATTEMPTS || options.authMaxAttempts || 5, 10);
    
    this.publicWindowMs = parseInt(process.env.PUBLIC_LIMIT_WINDOW_MS || options.publicWindowMs || 10 * 60 * 1000, 10);
    this.publicMaxRequests = parseInt(process.env.PUBLIC_MAX_REQUESTS || options.publicMaxRequests || 25, 10);

    this.authUserWindowMs = parseInt(process.env.AUTHENTICATED_LIMIT_WINDOW_MS || options.authUserWindowMs || 60 * 1000, 10);
    this.authUserMaxRequests = parseInt(process.env.AUTHENTICATED_MAX_REQUESTS || options.authUserMaxRequests || 120, 10);
  }

  /**
   * Exponential Backoff Calculator
   * Returns delay in seconds based on consecutive failures:
   * attempts 1-3: 0s
   * attempt 4: 2s
   * attempt 5: 4s
   * attempt 6: 8s
   * attempt 7: 16s
   * attempt 8+: 2^(attempts-3) up to maxBackoffSeconds (e.g. 900s = 15m)
   */
  calculateBackoffSeconds(attempts, maxBackoffSeconds = 900) {
    if (attempts <= 3) return 0;
    const exponent = attempts - 3;
    const delay = Math.pow(2, exponent);
    return Math.min(delay, maxBackoffSeconds);
  }

  /**
   * TIER 1: AUTHENTICATION ROUTES (login, signup, password-reset)
   * Tracks BOTH client IP and Account Identifier (email/username).
   * Applies Exponential Backoff rather than a hard lockout.
   */
  checkAuthRoute(ip, accountIdentifier, isSuccessfulAuth = false) {
    const now = Date.now();
    const ipKey = `auth_ip:${ip || 'unknown'}`;
    const accountKey = accountIdentifier ? `auth_account:${accountIdentifier.toLowerCase().trim()}` : null;

    // Reset failure counts on successful login
    if (isSuccessfulAuth) {
      memoryStore.delete(ipKey);
      if (accountKey) memoryStore.delete(accountKey);
      return { allowed: true, delaySeconds: 0 };
    }

    const ipRecord = this._getOrInitRecord(ipKey, this.authWindowMs, now);
    const accountRecord = accountKey ? this._getOrInitRecord(accountKey, this.authWindowMs, now) : null;

    ipRecord.attempts += 1;
    if (accountRecord) accountRecord.attempts += 1;

    const maxAttempts = Math.max(ipRecord.attempts, accountRecord ? accountRecord.attempts : 0);
    const backoffSeconds = this.calculateBackoffSeconds(maxAttempts);

    // If backoff is currently active
    const nextAllowedTime = Math.max(ipRecord.lockUntil || 0, accountRecord ? (accountRecord.lockUntil || 0) : 0);
    if (now < nextAllowedTime) {
      const waitRemainingSec = Math.ceil((nextAllowedTime - now) / 1000);
      return {
        allowed: false,
        retryAfter: waitRemainingSec,
        attempts: maxAttempts,
        reason: `Too many failed attempts. Exponential backoff active. Please wait ${waitRemainingSec}s.`
      };
    }

    // Set next lock interval if threshold reached
    if (backoffSeconds > 0) {
      const lockUntil = now + (backoffSeconds * 1000);
      ipRecord.lockUntil = lockUntil;
      if (accountRecord) accountRecord.lockUntil = lockUntil;
    }

    return {
      allowed: true,
      attempts: maxAttempts,
      remainingAttempts: Math.max(0, this.authMaxAttempts - maxAttempts),
      backoffSeconds
    };
  }

  /**
   * TIER 2: PUBLIC ENDPOINTS (plan selection booking, inquiries, contact form)
   * Moderate limit per IP to block bots and scrapers.
   */
  checkPublicEndpoint(ip) {
    const now = Date.now();
    const key = `public:${ip || 'unknown'}`;
    const record = this._getOrInitRecord(key, this.publicWindowMs, now);

    record.attempts += 1;

    if (record.attempts > this.publicMaxRequests) {
      const resetInSeconds = Math.ceil((record.resetTime - now) / 1000);
      return {
        allowed: false,
        retryAfter: resetInSeconds,
        remaining: 0,
        reason: `Rate limit exceeded. Please retry in ${resetInSeconds}s.`
      };
    }

    return {
      allowed: true,
      remaining: this.publicMaxRequests - record.attempts,
      retryAfter: 0
    };
  }

  /**
   * TIER 3: AUTHENTICATED USER ACTIONS
   * Looser limits (e.g. 120 req/min) keyed by authenticated user ID or token hash.
   */
  checkAuthenticatedUser(userId) {
    const now = Date.now();
    const key = `user:${userId || 'guest'}`;
    const record = this._getOrInitRecord(key, this.authUserWindowMs, now);

    record.attempts += 1;

    if (record.attempts > this.authUserMaxRequests) {
      const resetInSeconds = Math.ceil((record.resetTime - now) / 1000);
      return {
        allowed: false,
        retryAfter: resetInSeconds,
        remaining: 0,
        reason: `User action limit reached. Please wait ${resetInSeconds}s.`
      };
    }

    return {
      allowed: true,
      remaining: this.authUserMaxRequests - record.attempts,
      retryAfter: 0
    };
  }

  _getOrInitRecord(key, windowMs, now) {
    let record = memoryStore.get(key);
    if (!record || now > record.resetTime) {
      record = {
        attempts: 0,
        resetTime: now + windowMs,
        lockUntil: 0
      };
      memoryStore.set(key, record);
    }

    // Periodic memory garbage collector
    if (memoryStore.size > 5000) {
      for (const [k, v] of memoryStore.entries()) {
        if (now > v.resetTime) memoryStore.delete(k);
      }
    }

    return record;
  }
}

module.exports = new TieredRateLimiter();
