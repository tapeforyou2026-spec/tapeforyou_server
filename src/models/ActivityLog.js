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
}, { tableName: 'activity_logs', timestamps: true, underscored: true, updatedAt: false });
