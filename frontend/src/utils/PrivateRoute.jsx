import React from "react";
import { Navigate } from "react-router-dom";
import { checkUserPermission, isSuperAdminUser } from "./permissions";
import Unauthorized from "../components/Unauthorized";

const PrivateRoute = ({ element, permission, moduleName }) => {
  const isAuthenticated = localStorage.getItem("token");
  if (!isAuthenticated) return <Navigate to="/" />;

  if (permission && !isSuperAdminUser()) {
    const [mod, act = 'view'] = permission.split(':');
    const hasAccess = checkUserPermission(mod, act);
    if (!hasAccess) {
      return <Unauthorized moduleName={moduleName || mod} />;
    }
  }

  return element;
};

export default PrivateRoute;
