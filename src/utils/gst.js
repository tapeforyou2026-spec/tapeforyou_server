const calculateGST = (price, gstPercent) => {
  const gstAmount = parseFloat(((price * gstPercent) / 100).toFixed(2));
  const basePrice = parseFloat((price - gstAmount).toFixed(2));
  return { basePrice, gstAmount, totalPrice: price };
};

const calculateGSTFromBase = (basePrice, gstPercent) => {
  const gstAmount = parseFloat(((basePrice * gstPercent) / 100).toFixed(2));
  const totalPrice = parseFloat((basePrice + gstAmount).toFixed(2));
  return { basePrice, gstAmount, totalPrice };
};

const splitGST = (gstAmount, isInterState = false) => {
  if (isInterState) {
    return { cgst: 0, sgst: 0, igst: gstAmount };
  }
  const half = parseFloat((gstAmount / 2).toFixed(2));
  return { cgst: half, sgst: half, igst: 0 };
};

module.exports = { calculateGST, calculateGSTFromBase, splitGST };
