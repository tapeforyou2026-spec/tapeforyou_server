const crypto = require('crypto');

const generateOTP = (length = 6) =>
  crypto.randomInt(10 ** (length - 1), 10 ** length).toString();

const generateToken = (bytes = 32) =>
  crypto.randomBytes(bytes).toString('hex');

const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

const generateInvoiceNumber = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = crypto.randomInt(1000, 9999);
  return `INV-${year}${month}-${random}`;
};

const generateOrderNumber = () => {
  const date = new Date();
  const ts = date.getTime().toString().slice(-8);
  return `ORD-${ts}`;
};

module.exports = { generateOTP, generateToken, hashToken, generateInvoiceNumber, generateOrderNumber };
