const { Op } = require('sequelize');
const BaseRepository = require('./BaseRepository');
const { Order, OrderItem, Payment, Shipment, Invoice, User, Address, ProductVariant, Coupon } = require('../models');

class OrderRepository extends BaseRepository {
  constructor() {
    super(Order);
  }

  async findWithDetails(id) {
    return Order.findByPk(id, {
      include: [
        { model: OrderItem, as: 'items', include: [{ model: ProductVariant, as: 'variant' }] },
        { model: Payment, as: 'payment' },
        { model: Shipment, as: 'shipment' },
        { model: Invoice, as: 'invoice' },
        { model: User },
        { model: Address, as: 'shipping_address' },
        { model: Coupon },
      ],
    });
  }

  async findByOrderNumber(orderNumber) {
    return Order.findOne({
      where: { order_number: orderNumber },
      include: [
        { model: OrderItem, as: 'items' },
        { model: Payment, as: 'payment' },
        { model: Shipment, as: 'shipment' },
        { model: Address, as: 'shipping_address' },
      ],
    });
  }

  async getUserOrders(userId, { limit, offset }) {
    return Order.findAndCountAll({
      where: { user_id: userId },
      include: [
        { model: OrderItem, as: 'items' },
        { model: Payment, as: 'payment' },
        { model: Shipment, as: 'shipment' },
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });
  }

  async getDashboardStats() {
    const { sequelize } = require('../models');
    const [stats] = await sequelize.query(`
      SELECT
        COUNT(*) AS total_orders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) AS delivered,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total ELSE 0 END), 0) AS total_revenue,
        COALESCE(SUM(CASE WHEN DATE(created_at) = CURRENT_DATE AND payment_status = 'paid' THEN total ELSE 0 END), 0) AS today_revenue
      FROM orders
    `);
    return stats[0];
  }
}

module.exports = new OrderRepository();
