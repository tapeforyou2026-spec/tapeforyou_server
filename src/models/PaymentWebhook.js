// event_id is the real dedup key — HDFC's own event id (e.g. "evt_V2_...").
// timestamps:false since the real columns are received_at/processed_at, not
// the default created_at/updated_at pair (see the migration).
module.exports = (sequelize, DataTypes) => sequelize.define('PaymentWebhook', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  payment_id: { type: DataTypes.INTEGER, allowNull: true },
  event_id: { type: DataTypes.STRING(150), allowNull: false, unique: true },
  event_name: { type: DataTypes.STRING(100), allowNull: false },
  raw_payload: { type: DataTypes.JSONB, allowNull: false },
  processed: { type: DataTypes.BOOLEAN, defaultValue: false },
  received_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  processed_at: { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'payment_webhooks', timestamps: false, underscored: true });
