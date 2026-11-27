const db = require('../models');
const { hasPermission } = require('../helpers/rolePermissions');

/**
 * Middleware to enforce Role-Based Access Control on admin routes
 * @param {string} requiredPermission - Format: "module:action" (e.g. "users:edit", "payments:refund")
 */
const requirePermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      const authUser = req.auth;

      if (!authUser || authUser.role !== 'admin') {
        return res.status(403).json({
          success: false,
          code: 403,
          msg: "Forbidden: Admin privileges required",
          body: {}
        });
      }

      // If user is not explicitly a subadmin (i.e. main system admin account),
      // or if their roleSlug is super_admin, ALWAYS grant full access
      const isSubAdmin = !!authUser.isSubAdmin;
      const roleSlug = authUser.adminRoleSlug || (!isSubAdmin ? 'super_admin' : '');

      if (!isSubAdmin || roleSlug === 'super_admin' || !roleSlug) {
        return next();
      }

      // Check custom permission overrides on subadmin first
      let permissions = authUser.adminPermissions;
      if (typeof permissions === 'string') {
        try { permissions = JSON.parse(permissions); } catch (e) { permissions = []; }
      }

      // If not overridden on user, fetch from assigned admin_roles
      if (!permissions || (Array.isArray(permissions) && permissions.length === 0)) {
        if (authUser.adminRoleId && db.admin_roles) {
          const roleRecord = await db.admin_roles.findOne({ where: { id: authUser.adminRoleId } });
          if (roleRecord && roleRecord.permissions) {
            permissions = roleRecord.permissions;
            if (typeof permissions === 'string') {
              try { permissions = JSON.parse(permissions); } catch (e) { permissions = []; }
            }
          }
        }
      }

      if (hasPermission(permissions, roleSlug, requiredPermission)) {
        return next();
      }

      return res.status(403).json({
        success: false,
        code: 403,
        msg: `Access Denied: Your assigned role (${roleSlug || 'unassigned'}) does not have permission for [${requiredPermission}].`,
        body: {
          requiredPermission,
          roleSlug
        }
      });

    } catch (error) {
      console.error("RBAC Middleware Error:", error);
      return res.status(500).json({
        success: false,
        code: 500,
        msg: "Internal server error during authorization check",
        body: {}
      });
    }
  };
};

module.exports = {
  requirePermission
};
