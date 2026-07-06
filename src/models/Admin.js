const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  const Admin = sequelize.define('Admin', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, unique: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    avatar: { type: DataTypes.STRING, allowNull: true },
    phone: { type: DataTypes.STRING(15), allowNull: true },
    status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
    last_login: { type: DataTypes.DATE, allowNull: true },
    is_super_admin: { type: DataTypes.BOOLEAN, defaultValue: false },
  }, {
    tableName: 'admins',
    timestamps: true,
    underscored: true,
    defaultScope: { attributes: { exclude: ['password'] } },
    scopes: { withPassword: { attributes: {} } },
    hooks: {
      beforeCreate: async (admin) => {
        if (admin.password) admin.password = await bcrypt.hash(admin.password, 12);
      },
      beforeUpdate: async (admin) => {
        if (admin.changed('password')) admin.password = await bcrypt.hash(admin.password, 12);
      },
    },
  });

  Admin.prototype.comparePassword = async function (plain) {
    return bcrypt.compare(plain, this.password);
  };

  return Admin;
};
