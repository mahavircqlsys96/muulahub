import React from "react";
import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux";
import { isSuperAdminUser, isSubAdminUser } from "../utils/permissions";

const menuSections = [
  {
    label: "MAIN",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: "dashboard", permission: "dashboard:view" },
    ]
  },
  {
    label: "MANAGEMENT",
    items: [
      { to: "/usersList", label: "Users", icon: "people", activePaths: ["/usersView"], permission: "users:view" },
      // { to: "/providers",   label: "Providers",        icon: "verified_user",          activePaths: ["/providers/"] },
      { to: "/categories", label: "Service Categories", icon: "category", permission: "categories:view" },
      { to: "/bookings", label: "Bookings", icon: "event_available", activePaths: ["/bookings/"], permission: "bookings:view" },
      // { to: "/disputes", label: "Disputes", icon: "gavel" },
      { to: "/payments", label: "Payments", icon: "payments", permission: "payments:view" },
      { to: "/withdrawals", label: "Withdrawals", icon: "account_balance_wallet", permission: "withdrawals:view" },
      { to: "/wallets", label: "Wallets", icon: "account_balance", permission: "wallets:view" },
      { to: "/subadmins", label: "Sub-Admins", icon: "admin_panel_settings", permission: "subadmins:view", superAdminOnly: true },
      { to: "/roles", label: "Roles & Permissions", icon: "security", permission: "roles:view", superAdminOnly: true },
      // { to: "/locations", label: "Locations", icon: "public" },
      // { to: "/fraud-monitoring", label: "Fraud Monitoring", icon: "security" },
    ]
  },
  {
    label: "CONTENT",
    items: [
      { to: "/posts", label: "Posts", icon: "photo_library", permission: "posts:view" },
      { to: "/reports", label: "Reports", icon: "flag", permission: "reports:view" },
      { to: "/notifications", label: "Notifications", icon: "notifications", permission: "notifications:view" },
      { to: "/contactUs", label: "Support", icon: "support_agent", activePaths: ["/viewContactUs"], permission: "support:view" },
      { to: "/support-tickets", label: "Support Tickets", icon: "confirmation_number", activePaths: ["/support-tickets/"], permission: "support:view" },
    ]
  },
  {
    label: "CMS PAGES",
    superAdminOnly: true,
    items: [
      { to: "/cms/about-us", label: "About Us", icon: "info", permission: "cms:view", superAdminOnly: true },
      { to: "/cms/privacy", label: "Privacy Policy", icon: "privacy_tip", permission: "cms:view", superAdminOnly: true },
      { to: "/cms/terms", label: "Terms & Conditions", icon: "gavel", permission: "cms:view", superAdminOnly: true },
      { to: "/cms/faqs", label: "FAQs", icon: "help_outline", permission: "cms:view", superAdminOnly: true },
      { to: "/cms/community-guidelines", label: "Community Guidelines", icon: "rule", permission: "cms:view", superAdminOnly: true }
    ]
  },
  // {
  //   label: "MARKETING",
  //   items: [
  //     { to: "/promo-codes", label: "Promo Codes", icon: "local_offer" },
  //   ]
  // },
];

const isActivePath = (to, activePaths = []) =>
  window.location.pathname === to ||
  window.location.pathname.startsWith(`${to}/`) ||
  activePaths.some((p) => window.location.pathname.startsWith(p));

const Sidebar = ({ handleLinkClick, isCollapsed }) => {
  const reduxUser = useSelector((state) => state.users?.user);
  let localUser = null;
  try {
    localUser = JSON.parse(localStorage.getItem("user") || "null");
  } catch (e) {}

  // Prioritize whichever user object holds loaded data with an id
  const currentUser = (reduxUser && reduxUser.id) ? reduxUser : (localUser && localUser.id ? localUser : null);

  // Check super admin vs sub-admin
  const isSubAdmin = isSubAdminUser(currentUser);
  const isSuperAdmin = !isSubAdmin;

  let userPermissions = [];
  try {
    if (Array.isArray(currentUser?.permissions)) {
      userPermissions = currentUser.permissions;
    } else if (typeof currentUser?.permissions === 'string') {
      userPermissions = JSON.parse(currentUser.permissions);
    }
  } catch (e) {
    userPermissions = [];
  }

  // Filter menu sections by subadmin permissions
  const visibleSections = menuSections
    .filter((section) => {
      // If user is subadmin, NEVER show CMS PAGES section
      if (isSubAdmin) {
        if (section.superAdminOnly || section.label === "CMS PAGES") {
          return false;
        }
      }
      return true;
    })
    .map((section) => {
      const visibleItems = section.items.filter((item) => {
        // Sub-Admins: Strictly NEVER show subadmins, roles, or CMS tables
        if (isSubAdmin) {
          if (
            item.superAdminOnly ||
            item.to === "/subadmins" ||
            item.to === "/roles" ||
            item.to.startsWith("/cms")
          ) {
            return false;
          }
        }

        // Super Admin sees all modules without restriction
        if (isSuperAdmin) return true;

        // Sub-Admins: ONLY show modules that are explicitly in their permissions!
        if (!isSubAdmin) return false;

        // Check explicit item permission (e.g. "posts:view")
        if (item.permission && userPermissions.includes(item.permission)) return true;

        // Check module-level wildcard or any action granted in that module (e.g. "posts:*", "posts:add", "posts:edit")
        if (item.permission) {
          const [mod] = item.permission.split(':');
          if (userPermissions.includes(`${mod}:*`)) return true;
          if (userPermissions.includes(mod)) return true;
          if (userPermissions.some(p => p.startsWith(`${mod}:`))) return true;
        }

        return false;
      });
      return { ...section, items: visibleItems };
    })
    .filter((section) => section.items.length > 0);

  const renderNavItem = ({ to, label, icon, activePaths = [] }) => (
    <li key={to} style={{ margin: "2px 8px" }}>
      <NavLink
        to={to}
        onClick={handleLinkClick}
        className={({ isActive }) =>
          `sidebar-link ${isActive || isActivePath(to, activePaths) ? "active" : ""}`
        }
        style={({ isActive }) => {
          const active = isActive || isActivePath(to, activePaths);
          return {
            display: "flex",
            alignItems: "center",
            padding: isCollapsed ? "11px 0" : "10px 14px",
            justifyContent: isCollapsed ? "center" : "flex-start",
            borderRadius: "12px",
            textDecoration: "none",
            color: active ? "#fff" : "rgba(255,255,255,0.55)",
            background: active
              ? "linear-gradient(135deg, #f91942 0%, #6366f1 100%)"
              : "transparent",
            transition: "all 0.2s ease",
            gap: "12px",
            fontSize: "14px",
            fontWeight: active ? "600" : "400",
            boxShadow: active ? "0 4px 16px rgba(249,25,66,0.3)" : "none",
          };
        }}
      >
        <i
          className="material-icons"
          style={{ fontSize: "20px", flexShrink: 0, lineHeight: 1 }}
        >
          {icon}
        </i>
        {!isCollapsed && (
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {label}
          </span>
        )}
      </NavLink>
    </li>
  );

  return (
    <aside
      style={{
        width: "100%",
        height: "100vh",
        background: "linear-gradient(180deg, #070b14 0%, #0d1424 50%, #0b1020 100%)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* ── Logo ── */}
      <div
        style={{
          padding: "20px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          alignItems: "center",
          justifyContent: isCollapsed ? "center" : "flex-start",
          gap: "12px",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            background: "#ffffff",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            overflow: "hidden",
            boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
          }}
        >
          <img src="/logo-muulahub.png" alt="Muulahub Logo" style={{ width: "100%", height: "100%", objectFit: "contain", padding: "4px" }} />
        </div>
        {!isCollapsed && (
          <div>
            <div
              style={{
                fontWeight: "800",
                fontSize: "16px",
                letterSpacing: "-0.3px",
                background: "linear-gradient(135deg,#f91942,#ff4d6d)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Muulahub
            </div>
            <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "11px", marginTop: "1px" }}>
              Admin Panel
            </div>
          </div>
        )}
      </div>

      {/* ── Navigation ── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "10px 0",
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(249,25,66,0.2) transparent",
        }}
      >
        {visibleSections.map((section) => (
          <div key={section.label} style={{ marginBottom: "6px" }}>
            {!isCollapsed && (
              <div
                style={{
                  color: "rgba(255,255,255,0.22)",
                  fontSize: "10px",
                  fontWeight: "700",
                  letterSpacing: "1.8px",
                  padding: "8px 24px 4px",
                  textTransform: "uppercase",
                }}
              >
                {section.label}
              </div>
            )}
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {section.items.map(renderNavItem)}
            </ul>
          </div>
        ))}
      </div>

      {/* ── Footer Profile Link ── */}
      <div
        style={{
          padding: "14px 16px",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          flexShrink: 0,
        }}
      >
        <NavLink
          to="/profile"
          onClick={handleLinkClick}
          style={{
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div
            style={{
              width: "34px",
              height: "34px",
              background: "linear-gradient(135deg, rgba(249,25,66,0.2), rgba(255,77,109,0.2))",
              border: "1px solid rgba(249,25,66,0.3)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <i className="material-icons" style={{ color: "#f91942", fontSize: "18px" }}>
              account_circle
            </i>
          </div>
          {!isCollapsed && (
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px", fontWeight: "500" }}>
              My Profile
            </span>
          )}
        </NavLink>
      </div>
    </aside>
  );
};

export default Sidebar;
