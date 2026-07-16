const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, unique: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(150), allowNull: false, unique: true, validate: { isEmail: true } },
    phone: { type: DataTypes.STRING(15), allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    avatar: { type: DataTypes.STRING, allowNull: true },
    email_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
    mobile_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
    email_verify_token: { type: DataTypes.STRING, allowNull: true },
    email_verify_expires: { type: DataTypes.DATE, allowNull: true },
    reset_password_token: { type: DataTypes.STRING, allowNull: true },
    reset_password_expires: { type: DataTypes.DATE, allowNull: true },
    status: { type: DataTypes.ENUM('active', 'inactive', 'banned', 'pending'), defaultValue: 'active' },
    last_login: { type: DataTypes.DATE, allowNull: true },
    login_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  }, {
    tableName: 'users',
    timestamps: true,
    underscored: true,
    defaultScope: { attributes: { exclude: ['password', 'email_verify_token', 'reset_password_token'] } },
    scopes: {
      withPassword: { attributes: {} },
    },
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) user.password = await bcrypt.hash(user.password, 12);
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) user.password = await bcrypt.hash(user.password, 12);
      },
    },
  });

  User.prototype.comparePassword = async function (plain) {
    return bcrypt.compare(plain, this.password);
  };

  User.prototype.toPublic = function () {
    const { password, email_verify_token, reset_password_token, ...pub } = this.toJSON();
    return pub;
  };

  return User;
};
