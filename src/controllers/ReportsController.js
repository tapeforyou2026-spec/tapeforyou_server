const { sequelize } = require('../models');
const R = require('../utils/response');

exports.salesReport = async (req, res) => {
  const { from, to } = req.query;
  const dateFilter = from && to ? `AND DATE(o.created_at) BETWEEN '${from}' AND '${to}'` : '';

  const [rows] = await sequelize.query(`
    SELECT
      DATE(o.created_at) as date,
      COUNT(o.id) as total_orders,
      SUM(CASE WHEN o.payment_status = 'paid' THEN o.total ELSE 0 END) as revenue,
      SUM(CASE WHEN o.payment_status = 'paid' THEN o.gst_amount ELSE 0 END) as gst_collected,
      COUNT(CASE WHEN o.status = 'cancelled' THEN 1 END) as cancellations
    FROM orders o
    WHERE 1=1 ${dateFilter}
    GROUP BY DATE(o.created_at)
    ORDER BY date DESC
    LIMIT 90
  `);
  return R.success(res, 'Sales report', rows);
};

exports.gstReport = async (req, res) => {
  const { month, year } = req.query;
  const [rows] = await sequelize.query(`
    SELECT
      oi.sku,
      oi.product_name,
      SUM(oi.quantity) as qty_sold,
      SUM(oi.total) as taxable_value,
      oi.gst_percent,
      SUM(oi.gst_amount) as total_gst,
      SUM(oi.gst_amount / 2) as cgst,
      SUM(oi.gst_amount / 2) as sgst
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.payment_status = 'paid'
      ${month ? `AND EXTRACT(MONTH FROM o.created_at) = ${parseInt(month)}` : ''}
      ${year ? `AND EXTRACT(YEAR FROM o.created_at) = ${parseInt(year)}` : ''}
    GROUP BY oi.sku, oi.product_name, oi.gst_percent
    ORDER BY total_gst DESC
  `);
  return R.success(res, 'GST report', rows);
};

exports.inventoryReport = async (req, res) => {
  const [rows] = await sequelize.query(`
    SELECT
      pv.sku,
      p.name as product_name,
      c.name as category,
      pv.color,
      pv.width,
      pv.length,
      pv.stock_qty,
      pv.low_stock_alert,
      pv.mrp,
      pv.selling_price,
      (pv.stock_qty * pv.mrp) as stock_value_mrp,
      (pv.stock_qty * pv.selling_price) as stock_value_selling,
      CASE WHEN pv.stock_qty = 0 THEN 'Out of Stock'
           WHEN pv.stock_qty <= pv.low_stock_alert THEN 'Low Stock'
           ELSE 'In Stock' END as stock_status
    FROM product_variants pv
    JOIN products p ON p.id = pv.product_id
    JOIN categories c ON c.id = p.category_id
    ORDER BY pv.stock_qty ASC
  `);
  return R.success(res, 'Inventory report', rows);
};

exports.customerReport = async (req, res) => {
  const [rows] = await sequelize.query(`
    SELECT
      u.id,
      u.name,
      u.email,
      u.phone,
      COUNT(o.id) as total_orders,
      COALESCE(SUM(CASE WHEN o.payment_status = 'paid' THEN o.total ELSE 0 END), 0) as total_spent,
      MAX(o.created_at) as last_order_date
    FROM users u
    LEFT JOIN orders o ON o.user_id = u.id
    GROUP BY u.id, u.name, u.email, u.phone
    ORDER BY total_spent DESC
    LIMIT 100
  `);
  return R.success(res, 'Customer report', rows);
};
