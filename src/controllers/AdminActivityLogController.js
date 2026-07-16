const { Op } = require('sequelize');
const { ActivityLog } = require('../models');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const { ACTIVITY_MODULES, ACTIVITY_ACTIONS } = require('../constants');
const R = require('../utils/response');

// Permission rule (per spec): Super Admin sees every log; Admin/Staff only
// ever see their own — enforced here server-side regardless of what `user`
// query param is passed, not just hidden in the UI.
function scopeToActor(req, where) {
  if (!req.admin.is_super_admin) {
    where.actor_id = req.admin.id;
  } else if (req.query.userId) {
    where.actor_id = parseInt(req.query.userId, 10);
  }
}

function buildWhere(req) {
  const where = {};
  scopeToActor(req, where);

  if (req.query.module) where.model = req.query.module;
  if (req.query.action) where.action = req.query.action;
  if (req.query.status) where.status = req.query.status;

  if (req.query.from || req.query.to) {
    where.created_at = {};
    if (req.query.from) where.created_at[Op.gte] = new Date(`${req.query.from}T00:00:00`);
    if (req.query.to) where.created_at[Op.lte] = new Date(`${req.query.to}T23:59:59`);
  }

  if (req.query.search) {
    const q = `%${req.query.search}%`;
    where[Op.or] = [
      { description: { [Op.iLike]: q } },
      { actor_name: { [Op.iLike]: q } },
      { actor_email: { [Op.iLike]: q } },
    ];
  }

  return where;
}

exports.list = async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const where = buildWhere(req);

  const { rows, count } = await ActivityLog.findAndCountAll({
    where,
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });
  return R.paginated(res, 'Activity logs', rows, getPaginationMeta(count, page, limit));
};

exports.detail = async (req, res) => {
  const where = { id: req.params.id };
  scopeToActor(req, where);

  const log = await ActivityLog.findOne({ where });
  if (!log) return R.notFound(res, 'Activity log not found');
  return R.success(res, 'Activity log detail', log);
};

exports.recent = async (req, res) => {
  const where = {};
  scopeToActor(req, where);

  const rows = await ActivityLog.findAll({ where, order: [['created_at', 'DESC']], limit: 10 });
  return R.success(res, 'Recent activity', rows);
};

// Super Admin only (route-gated) — CSV, since logs mix free-text
// descriptions with JSON diffs/snapshots that don't fit a clean PDF table.
exports.exportCsv = async (req, res) => {
  const where = buildWhere(req);
  const rows = await ActivityLog.findAll({ where, order: [['created_at', 'DESC']], limit: 5000 });

  const header = ['Log ID', 'Date', 'Time', 'User', 'Email', 'Role', 'Module', 'Action', 'Description', 'Record ID', 'Status', 'IP Address', 'Browser', 'OS', 'Device'];
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [header.map(escape).join(',')];

  for (const log of rows) {
    const created = new Date(log.created_at);
    lines.push([
      log.id,
      created.toLocaleDateString('en-IN'),
      created.toLocaleTimeString('en-IN'),
      log.actor_name,
      log.actor_email,
      log.actor_role,
      log.model,
      log.action,
      log.description,
      log.model_id,
      log.status,
      log.ip_address,
      log.browser,
      log.os,
      log.device,
    ].map(escape).join(','));
  }

  res.set({
    'Content-Type': 'text/csv',
    'Content-Disposition': `attachment; filename="activity-logs-${new Date().toISOString().slice(0, 10)}.csv"`,
  });
  return res.send(lines.join('\n'));
};

exports.filterOptions = async (req, res) => {
  return R.success(res, 'Filter options', {
    modules: Object.values(ACTIVITY_MODULES),
    actions: Object.values(ACTIVITY_ACTIONS),
  });
};
