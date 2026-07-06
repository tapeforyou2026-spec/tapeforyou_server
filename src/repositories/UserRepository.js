const BaseRepository = require('./BaseRepository');
const { User } = require('../models');

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  async findByEmail(email) {
    return User.scope('withPassword').findOne({ where: { email: email.toLowerCase() } });
  }

  async findByEmailPublic(email) {
    return User.findOne({ where: { email: email.toLowerCase() } });
  }

  async findByPhone(phone) {
    return User.findOne({ where: { phone } });
  }

  async findByResetToken(token) {
    return User.scope('withPassword').findOne({
      where: { reset_password_token: token },
    });
  }
}

module.exports = new UserRepository();
