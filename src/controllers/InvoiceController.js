const { Invoice, Order, User } = require('../models');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const R = require('../utils/response');

// Every invoice ever generated (InvoiceService writes one per order at
// creation time, regardless of payment method/status — see
// OrderService.createOrder) — this is the first place they're browsable as
// a list; previously the only way to reach one was the "Download Invoice"
// button on that one order's own detail page.
exports.adminList = async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const { rows, count } = await Invoice.findAndCountAll({
    include: [{ model: Order, attributes: ['id', 'order_number', 'status', 'payment_status', 'is_b2b'], include: [{ model: User, attributes: ['id', 'name', 'email'] }] }],
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });
  return R.paginated(res, 'Invoices', rows, getPaginationMeta(count, page, limit));
};
