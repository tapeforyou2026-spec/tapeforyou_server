module.exports = (sequelize, DataTypes) => sequelize.define('AdminRole', {
  admin_id: { type: DataTypes.INTEGER, allowNull: false },
  role_id: { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: 'admin_roles', timestamps: false, underscored: true });
