const { Op } = require('sequelize');
const { Admin, Role } = require('../models');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const ActivityLogService = require('../services/ActivityLogService');
const { ACTIVITY_MODULES, ACTIVITY_ACTIONS } = require('../constants');
const R = require('../utils/response');

const serializeAdmin = (admin, roles) => ({
  id: admin.id,
  uuid: admin.uuid,
  name: admin.name,
  email: admin.email,
  phone: admin.phone,
  avatar: admin.avatar,
  status: admin.status,
  is_super_admin: admin.is_super_admin,
  last_login: admin.last_login,
  createdAt: admin.createdAt,
  role: roles?.[0] ? { id: roles[0].id, name: roles[0].name, slug: roles[0].slug } : null,
});

exports.listRoles = async (req, res) => {
  const roles = await Role.findAll({ order: [['id', 'ASC']] });
  return R.success(res, 'Roles', roles);
};

exports.list = async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const where = {};
  if (req.query.q) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${req.query.q}%` } },
      { email: { [Op.iLike]: `%${req.query.q}%` } },
    ];
  }

  const { rows, count } = await Admin.findAndCountAll({ where, limit, offset, order: [['created_at', 'DESC']] });
  const data = await Promise.all(rows.map(async (admin) => serializeAdmin(admin, await admin.getRoles())));
  return R.paginated(res, 'Admins fetched', data, getPaginationMeta(count, page, limit));
};

exports.detail = async (req, res) => {
  const admin = await Admin.findByPk(req.params.id);
  if (!admin) return R.notFound(res, 'Admin not found');
  return R.success(res, 'Admin details', serializeAdmin(admin, await admin.getRoles()));
};

exports.create = async (req, res) => {
  const { name, email, phone, password, role: roleSlug } = req.body;

  const existing = await Admin.findOne({ where: { email } });
  if (existing) return R.error(res, 'An admin with this email already exists');

  const role = await Role.findOne({ where: { slug: roleSlug } });
  if (!role) return R.error(res, 'Invalid role');

  const admin = await Admin.create({
    name, email, phone, password,
    is_super_admin: roleSlug === 'super_admin',
    status: 'active',
  });
  await admin.setRoles([role]);

  ActivityLogService.log({
    req, module: ACTIVITY_MODULES.ADMINS, action: ACTIVITY_ACTIONS.ADMIN_CREATED,
    description: `${req.admin.name} created admin "${admin.name}" (${admin.email}) with role ${role.name}`,
    recordId: admin.id,
    newValues: { name: admin.name, email: admin.email, phone: admin.phone, role: role.slug },
  });

  return R.created(res, 'Admin created', serializeAdmin(admin, [role]));
};

exports.update = async (req, res) => {
  const admin = await Admin.findByPk(req.params.id);
  if (!admin) return R.notFound(res, 'Admin not found');

  const { name, phone, role: roleSlug } = req.body;
  const updates = {};
  const oldValues = { name: admin.name, phone: admin.phone };
  if (name) updates.name = name;
  if (phone !== undefined) updates.phone = phone || null;

  let role = null;
  const previousRole = admin.is_super_admin ? 'super_admin' : null;
  if (roleSlug) {
    if (admin.id === req.admin.id && roleSlug !== 'super_admin') {
      return R.error(res, 'You cannot change your own role');
    }
    role = await Role.findOne({ where: { slug: roleSlug } });
    if (!role) return R.error(res, 'Invalid role');
    updates.is_super_admin = roleSlug === 'super_admin';

    if (admin.is_super_admin && admin.status === 'active' && roleSlug !== 'super_admin') {
      const superAdminCount = await countActiveSuperAdmins();
      if (superAdminCount <= 1) return R.error(res, 'Cannot remove the last super admin');
    }
  }

  await admin.update(updates);
  if (role) await admin.setRoles([role]);

  ActivityLogService.log({
    req, module: ACTIVITY_MODULES.ADMINS, action: ACTIVITY_ACTIONS.ADMIN_UPDATED,
    description: `${req.admin.name} updated admin "${admin.name}"`,
    recordId: admin.id, oldValues, newValues: updates,
  });
  if (role && roleSlug !== previousRole) {
    ActivityLogService.log({
      req, module: ACTIVITY_MODULES.ADMINS, action: ACTIVITY_ACTIONS.ROLE_CHANGED,
      description: `${req.admin.name} changed ${admin.name}'s role to ${role.name}`,
      recordId: admin.id, oldValues: { role: previousRole }, newValues: { role: roleSlug },
    });
  }

  return R.success(res, 'Admin updated', serializeAdmin(admin, await admin.getRoles()));
};

exports.updateStatus = async (req, res) => {
  const admin = await Admin.findByPk(req.params.id);
  if (!admin) return R.notFound(res, 'Admin not found');

  const { status } = req.body;

  if (admin.id === req.admin.id && status === 'inactive') {
    return R.error(res, 'You cannot deactivate your own account');
  }

  if (admin.is_super_admin && admin.status === 'active' && status === 'inactive') {
    const superAdminCount = await countActiveSuperAdmins();
    if (superAdminCount <= 1) return R.error(res, 'Cannot deactivate the last super admin');
  }

  const oldStatus = admin.status;
  await admin.update({ status });

  ActivityLogService.log({
    req, module: ACTIVITY_MODULES.ADMINS, action: ACTIVITY_ACTIONS.ADMIN_STATUS_CHANGED,
    description: `${req.admin.name} changed ${admin.name}'s status from ${oldStatus} to ${status}`,
    recordId: admin.id, oldValues: { status: oldStatus }, newValues: { status },
  });

  return R.success(res, 'Admin status updated', serializeAdmin(admin, await admin.getRoles()));
};

exports.resetPassword = async (req, res) => {
  const admin = await Admin.findByPk(req.params.id);
  if (!admin) return R.notFound(res, 'Admin not found');

  await admin.update({ password: req.body.newPassword });

  ActivityLogService.log({
    req, module: ACTIVITY_MODULES.ADMINS, action: ACTIVITY_ACTIONS.PASSWORD_RESET,
    description: `${req.admin.name} reset the password for ${admin.name}`,
    recordId: admin.id,
  });

  return R.success(res, 'Password reset successfully');
};

async function countActiveSuperAdmins() {
  return Admin.count({ where: { is_super_admin: true, status: 'active' } });
}
