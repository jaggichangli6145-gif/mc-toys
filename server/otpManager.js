const crypto = require('crypto');

class OtpManager {
  constructor() {
    // In-memory store: mobile -> { otp, expiresAt, attempts, lastRequestedAt, verified, verifiedAt, token }
    this.store = new Map();
    // In-memory request tracker for rate limiting: mobile -> [timestamps]
    this.rateLimitMap = new Map();

    // Cleanup expired records every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  get expirySeconds() {
    return parseInt(process.env.OTP_EXPIRY_SECONDS, 10) || 300;
  }

  get cooldownSeconds() {
    return parseInt(process.env.OTP_COOLDOWN_SECONDS, 10) || 60;
  }

  get maxAttempts() {
    return parseInt(process.env.MAX_VERIFY_ATTEMPTS, 10) || 3;
  }

  /**
   * Validates standard Indian 10-digit mobile number (+91 prefix optional, starts with 6,7,8,9)
   */
  normalizeAndValidateMobile(input) {
    if (!input || typeof input !== 'string') {
      return { valid: false, error: 'Mobile number is required.' };
    }

    // Strip spaces, dashes, +91 or 91 or 0 prefix
    let clean = input.trim().replace(/[\s\-\(\)]/g, '');
    if (clean.startsWith('+91')) {
      clean = clean.slice(3);
    } else if (clean.startsWith('91') && clean.length === 12) {
      clean = clean.slice(2);
    } else if (clean.startsWith('0') && clean.length === 11) {
      clean = clean.slice(1);
    }

    // Must be exactly 10 digits starting with 6, 7, 8, or 9
    const regex = /^[6-9]\d{9}$/;
    if (!regex.test(clean)) {
      return {
        valid: false,
        error: 'Please enter a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9).'
      };
    }

    return { valid: true, mobile: clean };
  }

  /**
   * Check cooldown & rate limit (max 5 requests per 10 minutes)
   */
  checkRateLimit(mobile) {
    const now = Date.now();
    const existing = this.store.get(mobile);

    // 1. Cooldown check (e.g. 60 seconds)
    if (existing && existing.lastRequestedAt) {
      const elapsedSeconds = Math.floor((now - existing.lastRequestedAt) / 1000);
      if (elapsedSeconds < this.cooldownSeconds) {
        const waitSeconds = this.cooldownSeconds - elapsedSeconds;
        return {
          allowed: false,
          error: `Please wait ${waitSeconds}s before requesting a new OTP.`
        };
      }
    }

    // 2. Window limit (max 5 OTP requests in 10 minutes)
    const timestamps = this.rateLimitMap.get(mobile) || [];
    const tenMinAgo = now - 10 * 60 * 1000;
    const recent = timestamps.filter(t => t > tenMinAgo);

    if (recent.length >= 5) {
      return {
        allowed: false,
        error: 'Too many OTP requests for this number. Please try again in 10 minutes.'
      };
    }

    recent.push(now);
    this.rateLimitMap.set(mobile, recent);

    return { allowed: true };
  }

  /**
   * Generate secure 6-digit numeric OTP
   */
  generateOtp(mobile) {
    const otp = crypto.randomInt(100000, 999999).toString();
    const now = Date.now();
    const expiresAt = now + (this.expirySeconds * 1000);

    this.store.set(mobile, {
      otp: otp,
      expiresAt: expiresAt,
      attempts: 0,
      lastRequestedAt: now,
      verified: false,
      token: null
    });

    return {
      otp,
      expiresInSeconds: this.expirySeconds
    };
  }

  /**
   * Verify entered OTP against stored record
   */
  verifyOtp(mobile, enteredOtp) {
    const record = this.store.get(mobile);
    const now = Date.now();

    if (!record) {
      return {
        success: false,
        error: 'No active OTP request found for this mobile number. Please click "Send OTP".'
      };
    }

    // Check expiration
    if (now > record.expiresAt) {
      this.store.delete(mobile);
      return {
        success: false,
        expired: true,
        error: 'This OTP has expired. Please request a new OTP.'
      };
    }

    // Check maximum attempts
    if (record.attempts >= this.maxAttempts) {
      this.store.delete(mobile);
      return {
        success: false,
        locked: true,
        error: 'Maximum verification attempts exceeded. Please request a new OTP.'
      };
    }

    record.attempts += 1;

    // Compare OTP
    if (record.otp !== String(enteredOtp).trim()) {
      const remaining = this.maxAttempts - record.attempts;
      if (remaining <= 0) {
        this.store.delete(mobile);
        return {
          success: false,
          locked: true,
          error: 'Invalid OTP. Maximum attempts exceeded. Please request a new OTP.'
        };
      }
      return {
        success: false,
        remainingAttempts: remaining,
        error: `Invalid OTP code. ${remaining} attempt(s) remaining.`
      };
    }

    // Success! Generate verified token
    const token = crypto.randomBytes(24).toString('hex');
    record.verified = true;
    record.verifiedAt = now;
    record.token = token;
    // Invalidate OTP so it cannot be reused
    record.otp = null;

    return {
      success: true,
      token: token,
      message: 'Phone number verified successfully.'
    };
  }

  /**
   * Check if mobile is verified with valid token
   */
  isVerified(mobile, token) {
    const record = this.store.get(mobile);
    if (!record) return false;
    return record.verified && record.token === token;
  }

  cleanup() {
    const now = Date.now();
    for (const [mobile, data] of this.store.entries()) {
      if (now > data.expiresAt && !data.verified) {
        this.store.delete(mobile);
      }
    }
  }
}

module.exports = new OtpManager();