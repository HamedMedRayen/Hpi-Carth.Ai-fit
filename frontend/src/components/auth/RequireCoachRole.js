import React, { useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../utils/auth";
import { api } from "../../utils/api";

/**
 * RequireCoachRole — Route guard ensuring only coach-role users can access coach workspace sections.
 * Redirects athlete-role users back to /coach (the athlete-facing My Coach view).
 */
export default function RequireCoachRole({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const [role, setRole] = useState(user?.role || user?.profile?.role || null);
  const [checking, setChecking] = useState(!role);

  useEffect(() => {
    let isMounted = true;
    api.getCoachRole()
      .then((res) => {
        if (isMounted) {
          setRole(res?.role || "athlete");
          setChecking(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setRole(user?.role || "athlete");
          setChecking(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [user]);

  if (checking) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-2)" }}>
        Loading Coach Workspace...
      </div>
    );
  }

  if (role !== "coach") {
    // Athlete attempted direct URL access to a coach-only sub-route -> redirect to root /coach (athlete view)
    return <Navigate to="/coach" replace state={{ from: location }} />;
  }

  return children;
}
