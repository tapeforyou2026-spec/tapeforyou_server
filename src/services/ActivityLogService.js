const { UAParser } = require('ua-parser-js');
const logger = require('../utils/logger');

// Single reusable entry point for every audit-log write in the app — every
// controller calls this instead of writing to ActivityLog directly, so the
// actor/browser/OS/device extraction logic lives in exactly one place.
// Deliberately never throws: a failed log write must never break the real
// action (a product save, an order status change, etc.) that triggered it —
// same fire-and-forget contract as NotificationService.
class ActivityLogService {
  // module: one of constants/index.js's ACTIVITY_MODULES
  // action: one of ACTIVITY_ACTIONS — human-readable, stored as-is (e.g. "Product Updated")
  // recordId: the affected row's id (product id, order id, ...)
  // oldValues / newValues: plain objects — only the fields that actually changed, not full rows
  // snapshot: full point-in-time copy of the record — required for delete actions (see callers),
  //   since the row itself will be gone and this is the only remaining record of what it was
  // actor: override for when req.admin isn't set yet (e.g. a failed login attempt) —
  //   pass { id, name, email, role } directly instead
  // actorType: 'admin' | 'user' — most actions in this app are admin-initiated
  //   (the default), but a few (Order Created, a customer cancelling their own
  //   order) are customer-initiated and read `req.user` instead of `req.admin`.
  async log({ req, module, action, description, recordId = null, oldValues = null, newValues = null, snapshot = null, status = 'success', actor = null, actorType = 'admin' }) {
    try {
      const { ActivityLog } = require('../models');

      const who = actor || (actorType === 'user' ? req?.user : req?.admin) || null;
      const userAgent = req?.headers?.['user-agent'] || null;
      let browser = null;
      let os = null;
      let device = null;

      if (userAgent) {
        const parsed = new UAParser(userAgent).getResult();
        browser = parsed.browser?.name ? `${parsed.browser.name} ${parsed.browser.version || ''}`.trim() : null;
        os = parsed.os?.name ? `${parsed.os.name} ${parsed.os.version || ''}`.trim() : null;
        device = parsed.device?.type
          ? parsed.device.type.charAt(0).toUpperCase() + parsed.device.type.slice(1)
          : 'Desktop';
      }

      await ActivityLog.create({
        actor_id: who?.id || null,
        actor_type: actorType,
        actor_name: who?.name || null,
        actor_email: who?.email || null,
        actor_role: who?.is_super_admin ? 'super_admin' : (who?.role || (who ? 'admin' : null)),
        action,
        model: module,
        model_id: recordId,
        description,
        old_values: oldValues,
        new_values: newValues,
        snapshot,
        ip_address: req?.ip || null,
        user_agent: userAgent,
        browser,
        os,
        device,
        status,
      });
    } catch (err) {
      logger.error(`ActivityLogService failed to write log (${module}/${action}): ${err.message}`);
    }
  }
}

module.exports = new ActivityLogService();
