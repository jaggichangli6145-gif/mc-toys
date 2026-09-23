const fs = require('fs');
const path = require('path');

const FILE_PATH = path.join(__dirname, 'orders.json');

class OrdersStore {
  constructor() {
    this.orders = [];
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(FILE_PATH)) {
        const raw = fs.readFileSync(FILE_PATH, 'utf8');
        this.orders = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Failed to load orders.json:', e.message);
      this.orders = [];
    }
  }

  save() {
    try {
      fs.writeFileSync(FILE_PATH, JSON.stringify(this.orders, null, 2));
    } catch (e) {
      console.warn('Failed to save orders.json:', e.message);
    }
  }

  createOrder(data) {
    const order = {
      orderId: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
      createdAt: new Date().toISOString(),
      customerName: data.customerName || 'Customer',
      mobile: data.mobile,
      address: data.address,
      items: data.items || [],
      total: Number(data.total) || 0,
      paymentMethod: data.paymentMethod || 'UPI',
      paymentStatus: data.paymentMethod === 'COD' ? 'Pending COD' : 'Pending Verification',
      utrNumber: data.utrNumber || '',
      verifiedAt: null
    };
    this.orders.unshift(order);
    this.save();
    return order;
  }

  submitUtr(orderId, utr) {
    const order = this.orders.find(o => o.orderId === orderId);
    if (!order) return null;
    order.utrNumber = String(utr).trim();
    order.paymentStatus = 'Pending Verification';
    order.utrSubmittedAt = new Date().toISOString();
    this.save();
    return order;
  }

  verifyOrder(orderId, status) {
    const order = this.orders.find(o => o.orderId === orderId);
    if (!order) return null;
    order.paymentStatus = status; // 'Paid' or 'Rejected'
    order.verifiedAt = new Date().toISOString();
    this.save();
    return order;
  }

  getAll() {
    return this.orders;
  }

  getById(orderId) {
    return this.orders.find(o => o.orderId === orderId);
  }
}

module.exports = new OrdersStore();