const { Notification } = require('../models');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const R = require('../utils/response');

// Admin-facing notifications are rows with `user_id: null` (see
// NotificationService) — customer-facing notifications, if ever built,
// would be the same table filtered the other way (`user_id: req.user.id`).
const ADMIN_SCOPE = { user_id: null };

exports.list = async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const { rows, count } = await Notification.findAndCountAll({
    where: ADMIN_SCOPE,
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });
  return R.paginated(res, 'Notifications', rows, getPaginationMeta(count, page, limit));
};

exports.unreadCount = async (req, res) => {
  const count = await Notification.count({ where: { ...ADMIN_SCOPE, is_read: false } });
  return R.success(res, 'Unread count', { count });
};

exports.markRead = async (req, res) => {
  const notification = await Notification.findOne({ where: { id: req.params.id, ...ADMIN_SCOPE } });
  if (!notification) return R.notFound(res, 'Notification not found');

  await notification.update({ is_read: true, read_at: new Date() });
  return R.success(res, 'Marked as read', notification);
};

exports.markAllRead = async (req, res) => {
  await Notification.update(
    { is_read: true, read_at: new Date() },
    { where: { ...ADMIN_SCOPE, is_read: false } }
  );
  return R.success(res, 'All notifications marked as read');
};
