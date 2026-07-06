module.exports = (sequelize, DataTypes) => sequelize.define('RolePermission', {
  role_id: { type: DataTypes.INTEGER, allowNull: false },
  permission_id: { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: 'role_permissions', timestamps: false, underscored: true });
