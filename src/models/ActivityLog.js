module.exports = (sequelize, DataTypes) => sequelize.define('ActivityLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  actor_id: { type: DataTypes.INTEGER, allowNull: true },
  actor_type: { type: DataTypes.ENUM('user', 'admin'), defaultValue: 'admin' },
  action: { type: DataTypes.STRING(100), allowNull: false },
  model: { type: DataTypes.STRING(50), allowNull: true },
  model_id: { type: DataTypes.INTEGER, allowNull: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  old_values: { type: DataTypes.JSONB, allowNull: true },
  new_values: { type: DataTypes.JSONB, allowNull: true },
  ip_address: { type: DataTypes.STRING(45), allowNull: true },
  user_agent: { type: DataTypes.STRING(500), allowNull: true },
  // Denormalized deliberately — a log for "Admin Deleted" must still show
  // who did it even after that actor's own Admin row is gone, and even a
  // still-existing actor's name/email/role can change later without
  // rewriting history.
  actor_name: { type: DataTypes.STRING(150), allowNull: true },
  actor_email: { type: DataTypes.STRING(150), allowNull: true },
  actor_role: { type: DataTypes.STRING(50), allowNull: true },
  browser: { type: DataTypes.STRING(100), allowNull: true },
  os: { type: DataTypes.STRING(100), allowNull: true },
  device: { type: DataTypes.STRING(100), allowNull: true },
  status: { type: DataTypes.ENUM('success', 'failed'), defaultValue: 'success' },
  // Full point-in-time copy of the record — the only thing that lets a
  // "Product Deleted" log keep showing name/SKU/category/price forever
  // after the actual product row is gone.
  snapshot: { type: DataTypes.JSONB, allowNull: true },
}, { tableName: 'activity_logs', timestamps: true, underscored: true, updatedAt: false });
