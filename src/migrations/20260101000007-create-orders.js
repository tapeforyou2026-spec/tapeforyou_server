'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('orders', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      order_number: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      user_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
      address_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'addresses', key: 'id' }, onDelete: 'SET NULL' },
      coupon_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'coupons', key: 'id' }, onDelete: 'SET NULL' },
      subtotal: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      discount_amount: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0 },
      coupon_discount: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0 },
      shipping_charge: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
      gst_amount: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0 },
      total: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      status: { type: Sequelize.ENUM('pending','confirmed','processing','shipped','delivered','cancelled','returned','refunded'), defaultValue: 'pending' },
      payment_status: { type: Sequelize.ENUM('pending','paid','failed','refunded','partially_refunded'), defaultValue: 'pending' },
      payment_method: { type: Sequelize.ENUM('razorpay','cod','upi','bank_transfer'), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      cancelled_at: { type: Sequelize.DATE, allowNull: true },
      cancel_reason: { type: Sequelize.STRING(500), allowNull: true },
      delivered_at: { type: Sequelize.DATE, allowNull: true },
      is_b2b: { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('orders', ['order_number']);
    await queryInterface.addIndex('orders', ['user_id']);
    await queryInterface.addIndex('orders', ['status']);

    await queryInterface.createTable('order_items', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      order_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'orders', key: 'id' }, onDelete: 'CASCADE' },
      variant_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'product_variants', key: 'id' }, onDelete: 'SET NULL' },
      product_name: { type: Sequelize.STRING(300), allowNull: false },
      sku: { type: Sequelize.STRING(100), allowNull: false },
      pack_size: { type: Sequelize.STRING(100), allowNull: true },
      color: { type: Sequelize.STRING(50), allowNull: true },
      width: { type: Sequelize.STRING(20), allowNull: true },
      length: { type: Sequelize.STRING(20), allowNull: true },
      quantity: { type: Sequelize.INTEGER, allowNull: false },
      unit_price: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      mrp: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      gst_percent: { type: Sequelize.DECIMAL(5, 2), defaultValue: 18 },
      gst_amount: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
      total: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.createTable('payments', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      order_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'orders', key: 'id' } },
      razorpay_order_id: { type: Sequelize.STRING(100), allowNull: true },
      razorpay_payment_id: { type: Sequelize.STRING(100), allowNull: true },
      razorpay_signature: { type: Sequelize.STRING(200), allowNull: true },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      currency: { type: Sequelize.STRING(10), defaultValue: 'INR' },
      method: { type: Sequelize.STRING(50), allowNull: true },
      status: { type: Sequelize.ENUM('pending','paid','failed','refunded','partially_refunded'), defaultValue: 'pending' },
      gateway_response: { type: Sequelize.JSONB, allowNull: true },
      refund_id: { type: Sequelize.STRING(100), allowNull: true },
      refund_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      refunded_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.createTable('shipments', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      order_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'orders', key: 'id' } },
      shiprocket_order_id: { type: Sequelize.STRING(100), allowNull: true },
      shiprocket_shipment_id: { type: Sequelize.STRING(100), allowNull: true },
      awb_code: { type: Sequelize.STRING(100), allowNull: true },
      courier_name: { type: Sequelize.STRING(100), allowNull: true },
      tracking_url: { type: Sequelize.STRING(500), allowNull: true },
      status: { type: Sequelize.ENUM('pending','booked','pickup_requested','picked_up','in_transit','out_for_delivery','delivered','failed','returned'), defaultValue: 'pending' },
      label_url: { type: Sequelize.STRING(500), allowNull: true },
      estimated_delivery: { type: Sequelize.DATE, allowNull: true },
      delivered_at: { type: Sequelize.DATE, allowNull: true },
      channel_order_id: { type: Sequelize.STRING(100), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.createTable('invoices', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      order_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'orders', key: 'id' } },
      invoice_number: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      invoice_date: { type: Sequelize.DATEONLY, allowNull: false },
      file_path: { type: Sequelize.STRING(500), allowNull: true },
      subtotal: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      cgst: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0 },
      sgst: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0 },
      igst: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0 },
      total_gst: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0 },
      total: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      is_inter_state: { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.createTable('notifications', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      type: { type: Sequelize.ENUM('order','payment','shipment','promo','system'), defaultValue: 'system' },
      title: { type: Sequelize.STRING(200), allowNull: false },
      body: { type: Sequelize.TEXT, allowNull: false },
      is_read: { type: Sequelize.BOOLEAN, defaultValue: false },
      data: { type: Sequelize.JSONB, allowNull: true },
      read_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.createTable('activity_logs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      actor_id: { type: Sequelize.INTEGER, allowNull: true },
      actor_type: { type: Sequelize.ENUM('user', 'admin'), defaultValue: 'admin' },
      action: { type: Sequelize.STRING(100), allowNull: false },
      model: { type: Sequelize.STRING(50), allowNull: true },
      model_id: { type: Sequelize.INTEGER, allowNull: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      old_values: { type: Sequelize.JSONB, allowNull: true },
      new_values: { type: Sequelize.JSONB, allowNull: true },
      ip_address: { type: Sequelize.STRING(45), allowNull: true },
      user_agent: { type: Sequelize.STRING(500), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },
  down: async (queryInterface) => {
    for (const t of ['activity_logs', 'notifications', 'invoices', 'shipments', 'payments', 'order_items', 'orders']) {
      await queryInterface.dropTable(t);
    }
  },
};
