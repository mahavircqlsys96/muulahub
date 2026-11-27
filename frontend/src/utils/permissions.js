/**
 * Frontend Role-Based Access Control (RBAC) Utility
 * Controls module access and action permissions (Add | Edit | View | Delete)
 */

export const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch (e) {
    return null;
  }
};

export const isSubAdminUser = (userOverride = null) => {
  if (localStorage.getItem('portalType') === 'subadmin') return true;
  const user = userOverride || getCurrentUser();
  if (!user) return false;
  if (user.isSubAdmin === 1 || user.isSubAdmin === true || user.isSubAdmin === '1') return true;
  if (user.roleSlug && user.roleSlug !== 'super_admin') return true;
  if (user.adminRoleSlug && user.adminRoleSlug !== 'super_admin') return true;

  let perms = user.permissions;
  if (typeof perms === 'string') {
    try { perms = JSON.parse(perms); } catch (e) { perms = []; }
  }
  if (Array.isArray(perms) && !perms.includes('*')) return true;
  return false;
};

export const isSuperAdminUser = (userOverride = null) => {
  if (localStorage.getItem('portalType') === 'subadmin') return false;
  const user = userOverride || getCurrentUser();
  if (!user) return false;
  if (isSubAdminUser(user)) return false;
  return user.role === 'admin' && (user.roleSlug === 'super_admin' || !user.isSubAdmin);
};

export const checkUserPermission = (moduleName, action = 'view', userOverride = null) => {
  const user = userOverride || getCurrentUser();
  if (!user) return false;

  // Sub-Admins are strictly barred from subadmins, roles, and CMS management
  if (['subadmins', 'roles', 'cms'].includes(moduleName)) {
    if (isSubAdminUser(user) || localStorage.getItem('portalType') === 'subadmin') {
      return false;
    }
  }

  // Super Admin has full, unrestricted access to all modules and actions
  if (isSuperAdminUser(user)) {
    return true;
  }

  const permissions = Array.isArray(user.permissions) ? user.permissions : [];

  // Full wildcard
  if (permissions.includes('*')) return true;

  // Direct exact match (e.g. "users:add", "bookings:view")
  if (permissions.includes(`${moduleName}:${action}`)) return true;

  // Module-level wildcard (e.g. "users:*")
  if (permissions.includes(`${moduleName}:*`)) return true;
  if (permissions.includes(moduleName)) return true;

  // Aliases mapping for common actions
  const actionAliases = {
    add: ['add', 'create', 'send', 'promo_create'],
    edit: ['edit', 'manage', 'suspend', 'reactivate', 'verify', 'hide', 'review', 'resolve', 'adjust', 'respond', 'update', 'approve', 'toggle', 'badges'],
    view: ['view', 'list', 'detail', 'export', 'stats'],
    delete: ['delete', 'remove', 'close', 'cancel']
  };

  const aliases = actionAliases[action] || [];
  for (const alias of aliases) {
    if (permissions.includes(`${moduleName}:${alias}`)) return true;
  }

  // Inverse alias check: if user has standard permission, check if requested action is covered
  for (const [standardAction, syns] of Object.entries(actionAliases)) {
    if (permissions.includes(`${moduleName}:${standardAction}`) && syns.includes(action)) {
      return true;
    }
  }

  return false;
};

export const usePermissions = () => {
  const user = getCurrentUser();
  const isSuperAdmin = isSuperAdminUser();
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];

  return {
    can: (moduleName, action = 'view') => checkUserPermission(moduleName, action),
    isSuperAdmin,
    permissions,
    user
  };
};

export default {
  checkUserPermission,
  isSuperAdminUser,
  usePermissions
};
