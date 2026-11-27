import React from "react";
import { Navigate } from "react-router-dom";
import { checkUserPermission, isSuperAdminUser, isSubAdminUser } from "./permissions";
import Unauthorized from "../components/Unauthorized";

const PrivateRoute = ({ element, permission, moduleName }) => {
  const isAuthenticated = localStorage.getItem("token");
  if (!isAuthenticated) return <Navigate to="/" />;

  const isSuper = isSuperAdminUser();
  const isSub = isSubAdminUser() || !isSuper;

  // Sub-Admins strictly forbidden from subadmins, roles, and CMS routes
  if (isSub) {
    if (
      permission === 'subadmins:view' ||
      permission === 'roles:view' ||
      permission === 'cms:view' ||
      ['Sub-Admins', 'Roles & Permissions', 'Privacy Policy', 'About Us', 'Terms & Conditions', 'FAQs', 'Community Guidelines'].includes(moduleName)
    ) {
      return <Unauthorized moduleName={moduleName || 'This section'} />;
    }
  }

  if (permission && !isSuper) {
    const [mod, act = 'view'] = permission.split(':');
    const hasAccess = checkUserPermission(mod, act);
    if (!hasAccess) {
      return <Unauthorized moduleName={moduleName || mod} />;
    }
  }

  return element;
};

export default PrivateRoute;
