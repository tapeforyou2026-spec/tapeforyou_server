const { sequelize, Order, Product, User, ProductVariant } = require('../models');
const OrderRepository = require('../repositories/OrderRepository');
const R = require('../utils/response');

exports.stats = async (req, res) => {
  const [orderStats] = await sequelize.query(`
    SELECT
      COUNT(*) AS total_orders,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending_orders,
      COUNT(CASE WHEN status = 'processing' THEN 1 END) AS processing_orders,
      COUNT(CASE WHEN status = 'shipped' THEN 1 END) AS shipped_orders,
      COUNT(CASE WHEN status = 'delivered' THEN 1 END) AS delivered_orders,
      COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled_orders,
      COUNT(CASE WHEN status = 'returned' THEN 1 END) AS returned_orders,
      COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total ELSE 0 END), 0) AS total_revenue,
      COALESCE(SUM(CASE WHEN DATE(created_at) = CURRENT_DATE AND payment_status = 'paid' THEN total ELSE 0 END), 0) AS today_revenue,
      COALESCE(SUM(CASE WHEN DATE_TRUNC('week', created_at) = DATE_TRUNC('week', NOW()) AND payment_status = 'paid' THEN total ELSE 0 END), 0) AS week_revenue,
      COALESCE(SUM(CASE WHEN DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW()) AND payment_status = 'paid' THEN total ELSE 0 END), 0) AS month_revenue
    FROM orders
  `);

  const totalProducts = await Product.count({ where: { status: 'active' } });
  const totalUsers = await User.count();
  const lowStockItems = await ProductVariant.count({ where: sequelize.literal('stock_qty <= low_stock_alert') });

  const [salesChart] = await sequelize.query(`
    SELECT DATE(created_at) as date, COALESCE(SUM(total), 0) as revenue, COUNT(*) as orders
    FROM orders
    WHERE created_at >= NOW() - INTERVAL '30 days' AND payment_status = 'paid'
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `);

  const [topProducts] = await sequelize.query(`
    SELECT p.name, SUM(oi.quantity) as units_sold, SUM(oi.total) as revenue
    FROM order_items oi
    JOIN products p ON p.id = (
      SELECT product_id FROM product_variants WHERE id = oi.variant_id LIMIT 1
    )
    JOIN orders o ON o.id = oi.order_id
    WHERE o.payment_status = 'paid'
    GROUP BY p.id, p.name
    ORDER BY units_sold DESC
    LIMIT 10
  `);

  const recentOrders = await Order.findAll({ limit: 10, order: [['created_at', 'DESC']], include: [{ model: User }] });

  return R.success(res, 'Dashboard stats', {
    orderStats: orderStats[0],
    totalProducts,
    totalUsers,
    lowStockItems,
    salesChart,
    topProducts,
    recentOrders,
  });
};

exports.lowStock = async (req, res) => {
  const items = await ProductVariant.findAll({
    where: sequelize.literal('stock_qty <= low_stock_alert'),
    include: [{ model: require('../models').Product }],
    order: [['stock_qty', 'ASC']],
    limit: 50,
  });
  return R.success(res, 'Low stock items', items);
};
