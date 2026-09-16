require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const otpManager = require('./server/otpManager');
const msg91Service = require('./server/msg91Service');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files (index.html, css, js, assets)
app.use(express.static(path.join(__dirname)));

// ==========================================
// OTP API ENDPOINTS
// ==========================================

/**
 * POST /api/otp/send
 * Body: { mobile: "9876543210" }
 */
app.post('/api/otp/send', async (req, res) => {
  try {
    const { mobile } = req.body;

    // 1. Validate Indian mobile format
    const validation = otpManager.normalizeAndValidateMobile(mobile);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    const cleanMobile = validation.mobile;

    // 2. Check cooldown and rate limits
    const rateCheck = otpManager.checkRateLimit(cleanMobile);
    if (!rateCheck.allowed) {
      return res.status(429).json({ success: false, error: rateCheck.error });
    }

    // 3. Generate OTP
    const { otp, expiresInSeconds } = otpManager.generateOtp(cleanMobile);

    // 4. Send through SMS provider (MSG91 or Development simulator)
    const sendResult = await msg91Service.sendOtp(cleanMobile, otp);

    const responsePayload = {
      success: true,
      message: sendResult.mode === 'development'
        ? 'OTP sent successfully (Development Test Mode)'
        : 'OTP sent to +91 ' + cleanMobile,
      mode: sendResult.mode,
      mobile: cleanMobile,
      expiresInSeconds: expiresInSeconds,
      cooldownSeconds: otpManager.cooldownSeconds
    };

    // Safely include test OTP in response ONLY in development mode for easy UI testing
    if (sendResult.mode === 'development') {
      responsePayload.devOtp = sendResult.devOtp;
      responsePayload.isDevelopment = true;
    }

    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error('Error in /api/otp/send:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to dispatch OTP. Please try again.'
    });
  }
});

/**
 * POST /api/otp/verify
 * Body: { mobile: "9876543210", otp: "123456" }
 */
app.post('/api/otp/verify', (req, res) => {
  try {
    const { mobile, otp } = req.body;

    // Validate phone number
    const validation = otpManager.normalizeAndValidateMobile(mobile);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    if (!otp || String(otp).trim().length < 4) {
      return res.status(400).json({ success: false, error: 'Please enter a valid OTP code.' });
    }

    const cleanMobile = validation.mobile;
    const result = otpManager.verifyOtp(cleanMobile, otp);

    if (!result.success) {
      const statusCode = result.locked ? 423 : (result.expired ? 410 : 400);
      return res.status(statusCode).json(result);
    }

    return res.status(200).json({
      success: true,
      message: 'Phone number verified successfully.',
      mobile: cleanMobile,
      verifiedToken: result.token
    });
  } catch (error) {
    console.error('Error in /api/otp/verify:', error.message);
    return res.status(500).json({ success: false, error: 'Internal verification error.' });
  }
});

/**
 * GET /api/admin/sms-config
 * Returns safe metadata for the Admin Panel SMS/OTP Settings tab.
 * NEVER returns the raw secret authkey!
 */
app.get('/api/admin/sms-config', (req, res) => {
  const safeConfig = msg91Service.getSafeConfig();
  res.json({
    success: true,
    config: {
      ...safeConfig,
      expirySeconds: otpManager.expirySeconds,
      cooldownSeconds: otpManager.cooldownSeconds,
      maxAttempts: otpManager.maxAttempts,
      countryCode: '+91 (India)',
      activeOtpCount: otpManager.store.size
    }
  });
});

/**
 * POST /api/orders/place
 * Validates verified token before processing order
 */
app.post('/api/orders/place', (req, res) => {
  try {
    const { mobile, verifiedToken, items, total, customerName, address } = req.body;

    if (!mobile || !verifiedToken) {
      return res.status(400).json({
        success: false,
        error: 'Phone number verification is required before placing an order.'
      });
    }

    const validation = otpManager.normalizeAndValidateMobile(mobile);
    if (!validation.valid || !otpManager.isVerified(validation.mobile, verifiedToken)) {
      return res.status(403).json({
        success: false,
        error: 'Phone verification expired or invalid. Please verify your mobile number again.'
      });
    }

    // In a full DB setup, order would be persisted here
    const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);

    return res.status(200).json({
      success: true,
      orderId: orderId,
      message: 'Order placed successfully!',
      verifiedPhone: '+91 ' + validation.mobile
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Order processing error.' });
  }
});

// Fallback to index.html for single-page routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  const config = msg91Service.getSafeConfig();
  console.log(`🚀 TOYLAND Store server running at http://localhost:${PORT}`);
  console.log(`📱 SMS Provider Mode : ${config.mode.toUpperCase()}`);
  console.log(`🔒 Security Status   : MSG91 Authkey is safely protected on server`);
  if (config.isDevelopment) {
    console.log(`💡 [DEV MODE NOTICE] OTPs will be simulated safely and logged here.`);
  } else {
    console.log(`⚡ [PRODUCTION NOTICE] Connected to MSG91 Gateway (Template: ${config.templateIdMasked})`);
  }
});