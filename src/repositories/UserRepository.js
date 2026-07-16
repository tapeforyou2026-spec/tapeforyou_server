const { Op, QueryTypes } = require('sequelize');
const BaseRepository = require('./BaseRepository');
const { User, sequelize } = require('../models');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  // Powers the admin Customers list. Plain `User.findAndCountAll` (the old
  // implementation) can't express "orders placed" / "amount spent" / "wishlist
  // size" without per-row N+1 queries, and the shipping/billing address split
  // doesn't exist as a schema concept (Address has no billing/shipping type,
  // just a generic address book) — so a customer's default address is shown as
  // "Shipping" and, if they have a separate address with a GSTIN on it (the
  // Address model's own comment marks `gstin` as "For B2B billing"), that one
  // is shown as "Billing". Falls back to the same address for both when there's
  // only one on file.
  async adminList({ search, limit, offset }) {
    const where = search ? {
      [Op.or]: [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
      ],
    } : {};

    const count = await User.count({ where });

    const rows = await sequelize.query(`
      SELECT
        u.id, u.name, u.email, u.phone, u.status, u.email_verified, u.mobile_verified,
        u.last_login, u.created_at,
        COALESCE(oc.order_count, 0)::int as order_count,
        COALESCE(oc.total_spent, 0) as total_spent,
        COALESCE(wc.wishlist_count, 0)::int as wishlist_count,
        sa.line1 as shipping_line1, sa.line2 as shipping_line2, sa.city as shipping_city,
        sa.state as shipping_state, sa.pincode as shipping_pincode,
        ba.line1 as billing_line1, ba.line2 as billing_line2, ba.city as billing_city,
        ba.state as billing_state, ba.pincode as billing_pincode,
        ba.gstin as gstin, ba.company_name as billing_company_name
      FROM users u
      LEFT JOIN (
        SELECT user_id, COUNT(*) as order_count,
               SUM(CASE WHEN payment_status = 'paid' THEN total ELSE 0 END) as total_spent
        FROM orders GROUP BY user_id
      ) oc ON oc.user_id = u.id
      LEFT JOIN (
        SELECT user_id, COUNT(*) as wishlist_count FROM wishlists GROUP BY user_id
      ) wc ON wc.user_id = u.id
      LEFT JOIN LATERAL (
        SELECT * FROM addresses a WHERE a.user_id = u.id
        ORDER BY a.is_default DESC, a.created_at ASC LIMIT 1
      ) sa ON true
      LEFT JOIN LATERAL (
        SELECT * FROM addresses a WHERE a.user_id = u.id AND a.gstin IS NOT NULL
        ORDER BY a.created_at DESC LIMIT 1
      ) ba ON true
      ${search ? `WHERE u.name ILIKE :search OR u.email ILIKE :search OR u.phone ILIKE :search` : ''}
      ORDER BY u.created_at DESC
      LIMIT :limit OFFSET :offset
    `, {
      replacements: { search: `%${search || ''}%`, limit, offset },
      type: QueryTypes.SELECT,
    });

    return { rows, count };
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

  // Login accepts either an email or an Indian mobile number — detect which
  // one was entered and look up accordingly. Scoped withPassword since this
  // is only ever used right before comparePassword().
  async findByIdentifier(identifier) {
    const isEmail = EMAIL_PATTERN.test(identifier);
    return User.scope('withPassword').findOne({
      where: isEmail ? { email: identifier.toLowerCase() } : { phone: identifier },
    });
  }

  async findByResetToken(token) {
    return User.scope('withPassword').findOne({
      where: { reset_password_token: token },
    });
  }
}

module.exports = new UserRepository();
