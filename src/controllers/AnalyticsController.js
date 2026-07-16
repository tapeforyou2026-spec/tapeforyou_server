const { sequelize } = require('../models');
const R = require('../utils/response');

// Real data, no placeholders — `view_count` (Product) and `traffic_source`
// (Order) are both new columns added specifically to back these two charts;
// see the migration `20260713180000-add-analytics-fields.js` and
// ProductController.show / OrderService.createOrder for where they're
// actually populated.

exports.mostViewedProducts = async (req, res) => {
  const [rows] = await sequelize.query(`
    SELECT id, name as product_name, view_count
    FROM products
    ORDER BY view_count DESC
    LIMIT 10
  `);
  return R.success(res, 'Most viewed products', rows);
};

exports.topSellingProducts = async (req, res) => {
  const [rows] = await sequelize.query(`
    SELECT
      p.id,
      p.name as product_name,
      COALESCE(SUM(CASE WHEN o.payment_status = 'paid' THEN oi.quantity ELSE 0 END), 0) as qty_sold,
      COALESCE(SUM(CASE WHEN o.payment_status = 'paid' THEN oi.total ELSE 0 END), 0) as revenue
    FROM products p
    LEFT JOIN product_variants pv ON pv.product_id = p.id
    LEFT JOIN order_items oi ON oi.variant_id = pv.id
    LEFT JOIN orders o ON o.id = oi.order_id
    GROUP BY p.id
    ORDER BY qty_sold DESC
    LIMIT 10
  `);
  return R.success(res, 'Top selling products', rows);
};

exports.revenueTrend = async (req, res) => {
  const [rows] = await sequelize.query(`
    SELECT
      TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') as month,
      DATE_TRUNC('month', created_at) as month_start,
      COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total ELSE 0 END), 0) as revenue
    FROM orders
    WHERE created_at >= NOW() - INTERVAL '12 months'
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY month_start ASC
  `);
  return R.success(res, 'Revenue trend', rows);
};

exports.avgOrderValue = async (req, res) => {
  const [rows] = await sequelize.query(`
    SELECT
      TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') as month,
      DATE_TRUNC('month', created_at) as month_start,
      COALESCE(AVG(CASE WHEN payment_status = 'paid' THEN total END), 0) as avg_order_value
    FROM orders
    WHERE created_at >= NOW() - INTERVAL '12 months'
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY month_start ASC
  `);
  return R.success(res, 'Average order value trend', rows);
};

// A customer's Nth order (N>1) counts as "returning" — counted per order,
// not deduplicated per customer, so a customer ordering twice in one month
// contributes one "new" and one "returning" order that month.
exports.returningCustomers = async (req, res) => {
  const [rows] = await sequelize.query(`
    WITH ranked_orders AS (
      SELECT id, user_id, created_at,
        ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) as order_rank
      FROM orders
    )
    SELECT
      TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') as month,
      DATE_TRUNC('month', created_at) as month_start,
      COUNT(CASE WHEN order_rank = 1 THEN 1 END) as new_customers,
      COUNT(CASE WHEN order_rank > 1 THEN 1 END) as returning_customers
    FROM ranked_orders
    WHERE created_at >= NOW() - INTERVAL '6 months'
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY month_start ASC
  `);
  return R.success(res, 'Returning vs new customers', rows);
};

exports.trafficSource = async (req, res) => {
  const [rows] = await sequelize.query(`
    SELECT
      COALESCE(traffic_source::text, 'unknown') as source,
      COUNT(*) as order_count,
      COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total ELSE 0 END), 0) as revenue
    FROM orders
    GROUP BY traffic_source
    ORDER BY order_count DESC
  `);
  return R.success(res, 'Traffic source breakdown', rows);
};
