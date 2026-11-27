/**
 * Role Definitions and Permission Matrix for Muula Hub
 * Internal Developer Specification Section 5 & Sub-Admin RBAC Specification
 */

const MODULES = {
  // Main Modules
  users: {
    label: "Users",
    category: "Main",
    actions: ["add", "edit", "view", "delete"]
  },
  categories: {
    label: "Service Categories",
    category: "Main",
    actions: ["add", "edit", "view", "delete"]
  },
  bookings: {
    label: "Bookings",
    category: "Main",
    actions: ["add", "edit", "view", "delete"]
  },
  payments: {
    label: "Payments",
    category: "Main",
    actions: ["add", "edit", "view", "delete"]
  },
  withdrawals: {
    label: "Withdrawals",
    category: "Main",
    actions: ["add", "edit", "view", "delete"]
  },
  wallets: {
    label: "Wallets",
    category: "Main",
    actions: ["add", "edit", "view", "delete"]
  },
  subadmins: {
    label: "Sub-Admins",
    category: "Main",
    actions: ["view"] // Sub-admins can NEVER add, edit or delete sub-admins; only Super Admin can!
  },
  roles: {
    label: "Roles & Permissions",
    category: "Main",
    actions: ["view"] // Sub-admins can NEVER manage roles; only Super Admin can!
  },

  // Content Modules
  posts: {
    label: "Posts",
    category: "Content",
    actions: ["add", "edit", "view", "delete"]
  },
  reports: {
    label: "Reports",
    category: "Content",
    actions: ["add", "edit", "view", "delete"]
  },
  notifications: {
    label: "Notifications",
    category: "Content",
    actions: ["add", "edit", "view", "delete"]
  },
  support: {
    label: "Support",
    category: "Content",
    actions: ["add", "edit", "view", "delete"]
  },

  // System Modules
  dashboard: {
    label: "Dashboard & Analytics",
    category: "System",
    actions: ["view"]
  },
  cms: {
    label: "CMS Pages & Policies",
    category: "System",
    actions: ["view", "edit"]
  }
};

const SYSTEM_ROLES = [
  {
    name: "Super Admin",
    slug: "super_admin",
    description: "Full visibility and control across all authorized modules, analytics, financial reports, settings, audit logs and sub-admin management.",
    permissions: ["*"],
    isSystem: 1
  },
  {
    name: "Operations Admin",
    slug: "operations_admin",
    description: "Manage users, professionals, bookings, service listings, verification status, operational disputes and relevant payment statuses.",
    permissions: [
      "dashboard:view",
      "users:view", "users:edit", "users:suspend", "users:reactivate",
      "providers:view", "providers:verify", "providers:edit",
      "bookings:view", "bookings:edit", "bookings:manage",
      "categories:view", "categories:create", "categories:edit",
      "disputes:view", "disputes:manage",
      "payments:view"
    ],
    isSystem: 1
  },
  {
    name: "Finance Admin",
    slug: "finance_admin",
    description: "Manage transactions, wallets, payouts, refunds, Stripe statuses, chargebacks and financial reports.",
    permissions: [
      "dashboard:view",
      "payments:view", "payments:refund", "payments:export",
      "withdrawals:view", "withdrawals:approve", "withdrawals:reject", "withdrawals:payout", "withdrawals:export",
      "wallets:view", "wallets:reconcile",
      "bookings:view"
    ],
    isSystem: 1
  },
  {
    name: "Senior Content Moderator",
    slug: "senior_content_moderator",
    description: "Oversee public content, reports, profiles, listings, live streams/recordings, violations, appeals, warning issuance and temporary suspensions.",
    permissions: [
      "dashboard:view",
      "posts:view", "posts:hide", "posts:remove", "posts:restore",
      "reports:view", "reports:review", "reports:uphold", "reports:dismiss", "reports:warn", "reports:suspend",
      "events:view", "events:monitor", "events:terminate",
      "users:view", "users:suspend"
    ],
    isSystem: 1
  },
  {
    name: "Content Moderator",
    slug: "content_moderator",
    description: "Review public profiles, posts, videos, comments, reviews, live streams and assigned moderation reports.",
    permissions: [
      "posts:view", "posts:hide", "posts:remove",
      "reports:view", "reports:review", "reports:uphold", "reports:dismiss", "reports:warn",
      "events:view",
      "users:view"
    ],
    isSystem: 1
  },
  {
    name: "Customer Support Supervisor",
    slug: "support_supervisor",
    description: "Manage support tickets, user profiles, bookings, payment/withdrawal statuses, support history and team escalation routing.",
    permissions: [
      "dashboard:view",
      "support:view", "support:assign", "support:respond", "support:escalate", "support:close",
      "users:view",
      "bookings:view",
      "payments:view",
      "withdrawals:view"
    ],
    isSystem: 1
  },
  {
    name: "Customer Support Agent",
    slug: "support_agent",
    description: "Handle assigned support tickets, basic user profiles, relevant bookings, case history and approved response macros.",
    permissions: [
      "support:view", "support:respond", "support:escalate", "support:close",
      "users:view",
      "bookings:view",
      "payments:view",
      "withdrawals:view"
    ],
    isSystem: 1
  },
  {
    name: "Verification Admin",
    slug: "verification_admin",
    description: "Review and approve/reject professional applications, qualifications, submitted ID documents and grant/revoke verified badges.",
    permissions: [
      "dashboard:view",
      "providers:view", "providers:verify", "providers:reject", "providers:badges",
      "users:view"
    ],
    isSystem: 1
  },
  {
    name: "Marketing and Communications Admin",
    slug: "marketing_admin",
    description: "Manage announcements, promotional codes, campaign banners, featured profiles and push notifications.",
    permissions: [
      "dashboard:view",
      "posts:view",
      "marketing:view", "marketing:promo_create", "marketing:promo_manage", "marketing:banner_manage",
      "notifications:view", "notifications:create", "notifications:send"
    ],
    isSystem: 1
  },
  {
    name: "Analyst / Read-only Admin",
    slug: "analyst",
    description: "Read-only access to authorized dashboards, aggregated bookings, growth, financial summaries and data export.",
    permissions: [
      "dashboard:view", "dashboard:export",
      "bookings:view",
      "payments:view", "payments:export",
      "withdrawals:view", "withdrawals:export",
      "reports:view", "reports:export"
    ],
    isSystem: 1
  }
];

/**
 * Seed all default administrative roles in DB if not already present
 */
async function seedDefaultRoles(db) {
  if (!db || !db.admin_roles) return;
  try {
    for (const roleDef of SYSTEM_ROLES) {
      const existing = await db.admin_roles.findOne({ where: { slug: roleDef.slug } });
      if (!existing) {
        await db.admin_roles.create({
          name: roleDef.name,
          slug: roleDef.slug,
          description: roleDef.description,
          permissions: roleDef.permissions,
          isSystem: 1
        });
      }
    }
  } catch (err) {
    console.error("Error seeding default admin roles:", err.message);
  }
}

/**
 * Check whether a set of permissions allows a specific action
 */
function hasPermission(userPermissions, roleSlug, requiredPerm) {
  if (roleSlug === 'super_admin') return true;
  if (!userPermissions) return false;

  const perms = Array.isArray(userPermissions)
    ? userPermissions
    : (typeof userPermissions === 'string' ? JSON.parse(userPermissions) : []);

  if (perms.includes('*')) return true;
  if (perms.includes(requiredPerm)) return true;

  // Check wildcard on module level (e.g. "users:*" matches "users:edit")
  const [mod, act] = requiredPerm.split(':');
  if (perms.includes(`${mod}:*`)) return true;
  if (perms.includes(mod)) return true;

  // Action aliases mapping to standard Add/Edit/View/Delete
  const actionAliases = {
    add: ['add', 'create', 'send', 'promo_create'],
    edit: ['edit', 'manage', 'suspend', 'reactivate', 'verify', 'hide', 'review', 'resolve', 'adjust', 'respond', 'update', 'approve', 'toggle', 'badges'],
    view: ['view', 'list', 'detail', 'export', 'stats'],
    delete: ['delete', 'remove', 'close', 'cancel']
  };

  for (const [standardAction, aliases] of Object.entries(actionAliases)) {
    if (aliases.includes(act)) {
      if (perms.includes(`${mod}:${standardAction}`)) return true;
    }
  }

  return false;
}

module.exports = {
  MODULES,
  SYSTEM_ROLES,
  seedDefaultRoles,
  hasPermission
};
