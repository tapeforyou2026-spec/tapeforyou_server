const ReturnService = require('../services/ReturnService');
const { Return, Order, User } = require('../models');
const ActivityLogService = require('../services/ActivityLogService');
const { ACTIVITY_MODULES, ACTIVITY_ACTIONS } = require('../constants');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const R = require('../utils/response');

// Thin HTTP layer only — all business logic lives in ReturnService, matching
// this project's existing Architecture Principles.

exports.requestReturn = async (req, res) => {
  const { orderId, reason } = req.body;
  const ret = await ReturnService.requestReturn(orderId, req.user.id, reason);

  ActivityLogService.log({
    req, module: ACTIVITY_MODULES.ORDERS, action: ACTIVITY_ACTIONS.RETURN_REQUESTED,
    description: `${req.user.name} requested a return for order #${orderId}: ${reason}`,
    recordId: ret.id, actorType: 'user', newValues: { status: ret.status, reason },
  });

  return R.created(res, 'Return request submitted', ret);
};

exports.myReturn = async (req, res) => {
  const ret = await Return.findOne({ where: { order_id: req.params.orderId } });
  if (!ret || ret.user_id !== req.user.id) return R.notFound(res, 'No return request found for this order');
  return R.success(res, 'Return request', ret);
};

// --- Admin ---

exports.adminList = async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const where = {};
  if (req.query.status) where.status = req.query.status;

  const { rows, count } = await Return.findAndCountAll({
    where,
    include: [
      { model: Order, attributes: ['id', 'order_number', 'total', 'payment_status', 'payment_method'] },
      { model: User, attributes: ['id', 'name', 'email'] },
    ],
    order: [['created_at', 'DESC']],
    limit, offset,
  });

  return R.paginated(res, 'Return requests', rows, getPaginationMeta(count, page, limit));
};

exports.adminDetail = async (req, res) => {
  const ret = await ReturnService.findWithDetails(req.params.id);
  if (!ret) return R.notFound(res, 'Return request not found');
  return R.success(res, 'Return request', ret);
};

exports.adminApprove = async (req, res) => {
  const ret = await ReturnService.approveReturn(req.params.id, req.admin.id, req.ip);

  ActivityLogService.log({
    req, module: ACTIVITY_MODULES.ORDERS, action: ACTIVITY_ACTIONS.RETURN_APPROVED,
    description: `${req.admin.name} approved return request #${ret.id}`,
    recordId: ret.id, newValues: { status: ret.status },
  });

  return R.success(res, 'Return approved', ret);
};

exports.adminReject = async (req, res) => {
  const ret = await ReturnService.rejectReturn(req.params.id, req.admin.id, req.body.admin_note);

  ActivityLogService.log({
    req, module: ACTIVITY_MODULES.ORDERS, action: ACTIVITY_ACTIONS.RETURN_REJECTED,
    description: `${req.admin.name} rejected return request #${ret.id}${req.body.admin_note ? `: ${req.body.admin_note}` : ''}`,
    recordId: ret.id, newValues: { status: ret.status },
  });

  return R.success(res, 'Return rejected', ret);
};

exports.adminMarkRefunded = async (req, res) => {
  const ret = await ReturnService.markRefunded(req.params.id, req.admin.id);

  ActivityLogService.log({
    req, module: ACTIVITY_MODULES.ORDERS, action: ACTIVITY_ACTIONS.RETURN_REFUNDED,
    description: `${req.admin.name} marked return request #${ret.id} as refunded`,
    recordId: ret.id, newValues: { status: ret.status },
  });

  return R.success(res, 'Return marked as refunded', ret);
};
