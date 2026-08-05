import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Users, Calendar, Sparkles, Trophy, ShieldCheck } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

const NAV_ITEMS = [
  { id: "roster", label: "Roster & Athletes", path: "/coach/roster", icon: Users, exact: false },
  { id: "schedule", label: "Schedule", path: "/coach/schedule", icon: Calendar, exact: false },
  { id: "ai-reports", label: "AI Reports", path: "/coach/ai-reports", icon: Sparkles, exact: false, badge: "Flagship" },
  { id: "events", label: "Challenges & Events", path: "/coach/events", icon: Trophy, exact: false },
];

export default function CoachWorkspaceNav({ athleteCount }) {
  const location = useLocation();

  const handleNavClick = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch {}
    }
  };

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "12px 20px",
      margin: "0 0 20px 0",
      background: "var(--bg-glass, rgba(15, 23, 42, 0.75))",
      border: "1px solid var(--border-card, rgba(255, 255, 255, 0.08))",
      borderRadius: "18px",
      backdropFilter: "blur(16px)",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.25)",
      gap: 16,
      flexWrap: "wrap",
    }}>
      {/* Workspace Branding / Badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          background: "linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)",
          border: "1px solid rgba(6, 182, 212, 0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--aura-cyan, #06b6d4)",
        }}>
          <ShieldCheck size={20} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", letterSpacing: "0.3px", display: "flex", alignItems: "center", gap: 6 }}>
            Coach Workspace
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-3, rgba(255,255,255,0.5))", fontWeight: 600 }}>
            {athleteCount !== undefined ? `${athleteCount} Active Athletes` : "Trainer Control Center"}
          </div>
        </div>
      </div>

      {/* Workspace Tabs */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: "rgba(0, 0, 0, 0.3)",
        padding: 4,
        borderRadius: 14,
        border: "1px solid rgba(255, 255, 255, 0.04)",
      }}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isRosterPath = item.id === "roster" && (
            location.pathname === "/coach" || 
            location.pathname === "/coach/" || 
            location.pathname.startsWith("/coach/roster")
          );
          const isActive = isRosterPath || location.pathname.startsWith(item.path);

          return (
            <NavLink
              key={item.id}
              to={item.path}
              onClick={handleNavClick}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: isActive ? 800 : 600,
                color: isActive ? "#fff" : "var(--color-text-2, rgba(255,255,255,0.65))",
                textDecoration: "none",
                background: isActive
                  ? "linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(59, 130, 246, 0.25) 100%)"
                  : "transparent",
                border: isActive
                  ? "1px solid rgba(6, 182, 212, 0.4)"
                  : "1px solid transparent",
                boxShadow: isActive ? "0 0 16px rgba(6, 182, 212, 0.25)" : "none",
                transition: "all 0.2s ease-in-out",
                position: "relative",
              }}
            >
              <Icon size={16} style={{ color: isActive ? "var(--aura-cyan, #06b6d4)" : "inherit" }} />
              <span>{item.label}</span>

              {item.badge && (
                <span style={{
                  fontSize: 9,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  padding: "2px 6px",
                  borderRadius: 6,
                  background: isActive ? "rgba(6, 182, 212, 0.4)" : "rgba(255, 255, 255, 0.1)",
                  color: isActive ? "#fff" : "var(--aura-cyan, #06b6d4)",
                  letterSpacing: "0.5px",
                }}>
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}
