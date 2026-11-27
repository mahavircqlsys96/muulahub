const db = require('../models');
const { hasPermission } = require('../helpers/rolePermissions');

/**
 * Middleware to enforce that ONLY Super Admin can perform the action
 * Blocks all sub-admins, even if assigned custom roles or permissions
 */
const requireSuperAdmin = (req, res, next) => {
  const authUser = req.auth;

  if (!authUser || authUser.role !== 'admin') {
    return res.status(403).json({
      success: false,
      code: 403,
      msg: "Forbidden: Super Admin privileges required",
      body: {}
    });
  }

  const isSubAdmin = !!authUser.isSubAdmin;
  const roleSlug = authUser.adminRoleSlug;

  if (isSubAdmin || (roleSlug && roleSlug !== 'super_admin')) {
    return res.status(403).json({
      success: false,
      code: 403,
      msg: "Access Denied: Only Super Admin has permission to perform this action.",
      body: {}
    });
  }

  next();
};

/**
 * Middleware to enforce Role-Based Access Control on admin routes
 * @param {string} moduleOrPerm - Format: "module:action" (e.g. "users:edit") or module name "users"
 * @param {string} [action] - Optional action if first argument is module name (e.g. "view", "edit", "add", "delete")
 */
const requirePermission = (moduleOrPerm, action) => {
  const requiredPermission = action ? `${moduleOrPerm}:${action}` : moduleOrPerm;

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

      // Check user active status in database
      const userRecord = await db.users.findOne({
        where: { id: authUser.id },
        attributes: ['id', 'status', 'role', 'isSubAdmin', 'adminRoleId', 'adminRoleSlug', 'adminPermissions', 'deletedAt']
      });

      if (!userRecord || userRecord.deletedAt !== null) {
        return res.status(403).json({
          success: false,
          code: 403,
          msg: "Forbidden: Account not found or has been removed",
          body: {}
        });
      }

      if (userRecord.status && userRecord.status !== 'active') {
        return res.status(403).json({
          success: false,
          code: 403,
          msg: "Forbidden: Your account is inactive or suspended. Please contact Super Admin.",
          body: {}
        });
      }

      // If user is not explicitly a subadmin (i.e. primary Super Admin account),
      // or if roleSlug is super_admin, grant full access automatically
      const isSubAdmin = !!userRecord.isSubAdmin;
      const roleSlug = userRecord.adminRoleSlug || (!isSubAdmin ? 'super_admin' : 'sub_admin');

      // Sub-Admins strictly forbidden from subadmins, roles, and CMS management
      if (isSubAdmin || (roleSlug && roleSlug !== 'super_admin')) {
        const [mod] = requiredPermission.split(':');
        if (['subadmins', 'roles', 'cms'].includes(mod)) {
          return res.status(403).json({
            success: false,
            code: 403,
            msg: `Access Denied: Only Super Admin has permission to access ${mod}.`,
            body: {}
          });
        }
      }

      if (!isSubAdmin && roleSlug === 'super_admin') {
        return next();
      }

      // Read fresh permissions directly from DB record so permission updates take effect immediately
      let permissions = userRecord.adminPermissions;
      if (typeof permissions === 'string') {
        try { permissions = JSON.parse(permissions); } catch (e) { permissions = []; }
      }

      // If not overridden on user, fetch from assigned admin_roles
      if (!permissions || (Array.isArray(permissions) && permissions.length === 0)) {
        if (userRecord.adminRoleId && db.admin_roles) {
          const roleRecord = await db.admin_roles.findOne({ where: { id: userRecord.adminRoleId } });
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
        msg: `Access Denied: You do not have permission for [${requiredPermission}].`,
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

// Alias function for checkPermission("users", "view")
const checkPermission = (moduleName, action = 'view') => requirePermission(moduleName, action);

module.exports = {
  requirePermission,
  checkPermission,
  requireSuperAdmin
};
