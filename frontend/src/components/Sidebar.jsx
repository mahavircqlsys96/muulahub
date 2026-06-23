import React from "react";
import { NavLink } from "react-router-dom";

const menuSections = [
  {
    label: "MAIN",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
    ]
  },
  {
    label: "MANAGEMENT",
    items: [
      { to: "/usersList",   label: "Users",           icon: "people",                 activePaths: ["/usersView"] },
      { to: "/providers",   label: "Providers",        icon: "verified_user",          activePaths: ["/providers/"] },
      { to: "/categories",  label: "Service Categories",icon: "category" },
      { to: "/bookings",    label: "Bookings",          icon: "event_available",       activePaths: ["/bookings/"] },
      { to: "/disputes",    label: "Disputes",          icon: "gavel" },
      { to: "/payments",    label: "Payments",          icon: "payments" },
      { to: "/withdrawals", label: "Withdrawals",       icon: "account_balance_wallet" },
      { to: "/wallets",     label: "Wallets",           icon: "account_balance" },
      { to: "/locations",   label: "Locations",         icon: "public" },
      { to: "/fraud-monitoring", label: "Fraud Monitoring", icon: "security" },
    ]
  },
  {
    label: "CONTENT",
    items: [
      { to: "/posts",         label: "Posts",         icon: "photo_library" },
      { to: "/reports",       label: "Reports",       icon: "flag" },
      { to: "/notifications", label: "Notifications", icon: "notifications" },
      { to: "/contactUs",     label: "Support",       icon: "support_agent", activePaths: ["/viewContactUs"] },
    ]
  },
  {
    label: "CMS PAGES",
    items: [
      { to: "/about-us",      label: "About Us",            icon: "info" },
      { to: "/privacy",       label: "Privacy Policy",      icon: "privacy_tip" },
      { to: "/terms",         label: "Terms & Conditions",  icon: "gavel" },
      { to: "/faqs",          label: "FAQs",                icon: "help_outline" },
      { to: "/community-guidelines", label: "Community Guidelines", icon: "rule" }
    ]
  },
  {
    label: "MARKETING",
    items: [
      { to: "/promo-codes",   label: "Promo Codes",   icon: "local_offer" },
    ]
  },
];

const isActivePath = (to, activePaths = []) =>
  window.location.pathname === to ||
  window.location.pathname.startsWith(`${to}/`) ||
  activePaths.some((p) => window.location.pathname.startsWith(p));

const Sidebar = ({ handleLinkClick, isCollapsed }) => {
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
        {menuSections.map((section) => (
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
