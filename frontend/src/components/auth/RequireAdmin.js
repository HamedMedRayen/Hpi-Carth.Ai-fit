import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../utils/auth";

/**
 * RequireAdmin — Route guard ensuring only admin-role users can access /admin routes.
 * Redirects non-admins to main dashboard (/).
 */
export default function RequireAdmin({ children }) {
  const { user } = useAuth();
  const location = useLocation();

  const userRole = user?.role || user?.profile?.role;

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  if (userRole !== "admin") {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return children;
}
