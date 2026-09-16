const https = require('https');

class Msg91Service {
  constructor() {
    this.authKey = process.env.MSG91_AUTH_KEY || '';
    this.templateId = process.env.MSG91_TEMPLATE_ID || '';
    this.senderId = process.env.MSG91_SENDER_ID || 'TOYLAND';
    this.provider = (process.env.SMS_PROVIDER || 'development').toLowerCase();
    this.isDev = this.provider === 'development';
  }

  isConfigured() {
    return Boolean(this.authKey && this.templateId);
  }

  getSafeConfig() {
    const isDev = (process.env.SMS_PROVIDER || 'development').toLowerCase() === 'development';
    const authKey = process.env.MSG91_AUTH_KEY || '';
    const templateId = process.env.MSG91_TEMPLATE_ID || '';
    const senderId = process.env.MSG91_SENDER_ID || 'TOYLAND';

    return {
      provider: isDev ? 'development' : 'msg91',
      mode: isDev ? 'development' : 'production',
      isDevelopment: isDev,
      senderId: senderId,
      templateIdConfigured: Boolean(templateId),
      templateIdMasked: templateId ? (templateId.slice(0, 3) + '••••' + templateId.slice(-3)) : 'Not Set',
      authKeyConfigured: Boolean(authKey),
      authKeyMasked: authKey ? (authKey.slice(0, 4) + '••••••••' + authKey.slice(-4)) : 'Not Configured',
      gatewayStatus: isDev ? 'Simulated (Dev Mode Active)' : (Boolean(authKey && templateId) ? 'Production (Ready)' : 'Missing Auth Key / Template ID')
    };
  }

  async sendOtp(mobile, otp) {
    const isDev = (process.env.SMS_PROVIDER || 'development').toLowerCase() === 'development';
    const authKey = process.env.MSG91_AUTH_KEY || '';
    const templateId = process.env.MSG91_TEMPLATE_ID || '';
    const senderId = process.env.MSG91_SENDER_ID || 'TOYLAND';

    if (isDev) {
      console.log('====================================================');
      console.log('📱 [DEV SMS SIMULATOR] TOYLAND Phone Verification');
      console.log('📞 Mobile    : +91 ' + mobile);
      console.log('🔑 OTP Code  : ' + otp);
      console.log('⏳ Validity  : ' + (process.env.OTP_EXPIRY_SECONDS || 300) + ' seconds');
      console.log('====================================================');
      return {
        success: true,
        mode: 'development',
        message: 'Development mode: OTP simulated successfully',
        devOtp: otp
      };
    }

    if (!authKey || !templateId) {
      throw new Error('MSG91 is set to production but MSG91_AUTH_KEY or MSG91_TEMPLATE_ID is not configured in .env');
    }

    const payload = JSON.stringify({
      template_id: templateId,
      mobile: '91' + mobile,
      authkey: authKey,
      otp: otp,
      sender: senderId
    });

    const url = 'https://control.msg91.com/api/v5/otp?template_id=' + encodeURIComponent(templateId) +
                '&mobile=' + encodeURIComponent('91' + mobile) +
                '&authkey=' + encodeURIComponent(authKey) +
                '&otp=' + encodeURIComponent(otp);

    return new Promise((resolve, reject) => {
      const req = https.request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authkey': authKey
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode >= 200 && res.statusCode < 300 && parsed.type !== 'error') {
              resolve({
                success: true,
                mode: 'production',
                message: parsed.message || 'OTP sent successfully via MSG91',
                requestId: parsed.request_id
              });
            } else {
              reject(new Error(parsed.message || 'MSG91 gateway error (HTTP ' + res.statusCode + ')'));
            }
          } catch (e) {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({ success: true, mode: 'production', raw: data });
            } else {
              reject(new Error('Failed to parse MSG91 response: ' + data));
            }
          }
        });
      });

      req.on('error', (err) => {
        reject(new Error('Network error connecting to MSG91: ' + err.message));
      });

      req.write(payload);
      req.end();
    });
  }
}

module.exports = new Msg91Service();