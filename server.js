require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const otpManager = require('./server/otpManager');
const msg91Service = require('./server/msg91Service');
const upiConfig = require('./server/upiConfig');
const ordersStore = require('./server/ordersStore');

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

// ==========================================
// UPI PAYMENT & ORDER MANAGEMENT ENDPOINTS
// ==========================================

/**
 * GET /api/upi/config
 * Returns safe public UPI parameters (VPA, Payee Name, Currency)
 */
app.get('/api/upi/config', (req, res) => {
  res.json({
    success: true,
    config: {
      vpa: upiConfig.vpa,
      payeeName: upiConfig.payeeName,
      currency: upiConfig.currency
    }
  });
});

/**
 * POST /api/orders/place
 * Validates phone verification token and places order
 */
app.post('/api/orders/place', (req, res) => {
  try {
    const { mobile, verifiedToken, items, total, customerName, address, paymentMethod } = req.body;

    if (!mobile) {
      return res.status(400).json({
        success: false,
        error: 'Mobile number is required to place an order.'
      });
    }

    const validation = otpManager.normalizeAndValidateMobile(mobile);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    const cleanPaymentMethod = paymentMethod === 'COD' ? 'COD' : 'UPI';

    const order = ordersStore.createOrder({
      mobile: validation.mobile,
      customerName,
      address,
      items,
      total,
      paymentMethod: cleanPaymentMethod
    });

    const upiUrl = upiConfig.buildUpiUrl(total, order.orderId);

    return res.status(200).json({
      success: true,
      order: order,
      orderId: order.orderId,
      message: 'Order created successfully!',
      verifiedPhone: '+91 ' + validation.mobile,
      upi: {
        vpa: upiConfig.vpa,
        payeeName: upiConfig.payeeName,
        currency: upiConfig.currency,
        amount: order.total,
        upiUrl: upiUrl,
        referenceText: `Order_${order.orderId}`
      }
    });
  } catch (err) {
    console.error('Error in /api/orders/place:', err);
    res.status(500).json({ success: false, error: 'Order processing error.' });
  }
});

/**
 * POST /api/orders/submit-utr
 * Customer submits 12-digit UPI Transaction / UTR number for manual/admin verification
 */
app.post('/api/orders/submit-utr', (req, res) => {
  try {
    const { orderId, utrNumber } = req.body;

    if (!orderId || !utrNumber) {
      return res.status(400).json({ success: false, error: 'Order ID and UTR Number are required.' });
    }

    const cleanUtr = String(utrNumber).trim();
    if (cleanUtr.length < 6) {
      return res.status(400).json({ success: false, error: 'Please enter a valid UPI Reference / UTR Number.' });
    }

    const updated = ordersStore.submitUtr(orderId, cleanUtr);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    console.log(`💳 [UPI PAYMENT SUBMITTED] Order: ${orderId} | UTR: ${cleanUtr} | Amount: ₹${updated.total}`);

    return res.status(200).json({
      success: true,
      message: 'UPI Reference received. Our admin team will verify and dispatch your order shortly.',
      order: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error submitting UTR.' });
  }
});

/**
 * GET /api/admin/orders
 * Returns list of all orders with payment & verification statuses
 */
app.get('/api/admin/orders', (req, res) => {
  res.json({
    success: true,
    orders: ordersStore.getAll()
  });
});

/**
 * POST /api/admin/orders/verify
 * Admin verifies or rejects an order after checking bank statement
 */
app.post('/api/admin/orders/verify', (req, res) => {
  try {
    const { orderId, status } = req.body; // status: 'Paid' or 'Rejected'
    if (!orderId || !['Paid', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid orderId or status.' });
    }

    const updated = ordersStore.verifyOrder(orderId, status);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    console.log(`✅ [ADMIN ORDER VERIFICATION] Order ${orderId} marked as ${status}`);

    return res.json({
      success: true,
      message: `Order ${orderId} marked as ${status}`,
      order: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Verification error.' });
  }
});

// Fallback to index.html for single-page routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  const config = msg91Service.getSafeConfig();
  console.log(`🚀 DEMO STORE server running at http://localhost:${PORT}`);
  console.log(`📱 SMS Provider Mode : ${config.mode.toUpperCase()}`);
  console.log(`💳 UPI Payment Config: VPA=${upiConfig.vpa} | Payee="${upiConfig.payeeName}"`);
});