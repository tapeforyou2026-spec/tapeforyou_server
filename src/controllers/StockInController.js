const { StockIn, ProductVariant, Product } = require('../models');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const R = require('../utils/response');

exports.list = async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const where = {};
  if (req.query.status) where.status = req.query.status;

  const { rows, count } = await StockIn.findAndCountAll({
    where,
    include: [{ model: ProductVariant, include: [{ model: Product }] }],
    limit,
    offset,
    order: [['created_at', 'DESC']],
  });
  return R.paginated(res, 'Incoming stock', rows, getPaginationMeta(count, page, limit));
};

exports.create = async (req, res) => {
  const variant = await ProductVariant.findByPk(req.body.variant_id);
  if (!variant) return R.notFound(res, 'Product variant not found');

  const stockIn = await StockIn.create(req.body);
  return R.created(res, 'Incoming stock logged', stockIn);
};

// Marks a pending stock-in as received and credits the variant's actual
// stock_qty by the received amount (defaults to the originally ordered
// quantity if the received amount wasn't specified — i.e. it arrived as
// ordered). This is the only place stock_qty changes as a result of a
// stock-in; cancelling one never touches stock_qty.
exports.markReceived = async (req, res) => {
  const stockIn = await StockIn.findByPk(req.params.id);
  if (!stockIn) return R.notFound(res, 'Incoming stock record not found');
  if (stockIn.status !== 'ordered') return R.error(res, `Already ${stockIn.status}`);

  const receivedQty = req.body.received_quantity || stockIn.quantity;

  await stockIn.update({ status: 'received', received_quantity: receivedQty, received_at: new Date() });
  await ProductVariant.increment({ stock_qty: receivedQty }, { where: { id: stockIn.variant_id } });

  return R.success(res, 'Stock received and added to inventory', stockIn);
};

exports.cancel = async (req, res) => {
  const stockIn = await StockIn.findByPk(req.params.id);
  if (!stockIn) return R.notFound(res, 'Incoming stock record not found');
  if (stockIn.status !== 'ordered') return R.error(res, `Already ${stockIn.status}`);

  await stockIn.update({ status: 'cancelled' });
  return R.success(res, 'Incoming stock cancelled', stockIn);
};
