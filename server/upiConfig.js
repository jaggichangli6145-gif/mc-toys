/**
 * Centralized UPI Configuration
 */
module.exports = {
  vpa: process.env.UPI_VPA || '7814249224@fam',
  payeeName: process.env.UPI_PAYEE_NAME || 'cheema store',
  currency: process.env.UPI_CURRENCY || 'INR',

  buildUpiUrl(amount, orderId) {
    const params = new URLSearchParams({
      pa: this.vpa,
      pn: this.payeeName,
      am: Number(amount).toFixed(2),
      cu: this.currency,
      tn: `Order_${orderId}`
    });
    return `upi://pay?${params.toString()}`;
  }
};