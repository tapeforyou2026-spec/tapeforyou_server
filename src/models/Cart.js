module.exports = (sequelize, DataTypes) => sequelize.define('Cart', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: true },
  session_id: { type: DataTypes.STRING(100), allowNull: true, comment: 'For guest carts' },
}, { tableName: 'carts', timestamps: true, underscored: true });
