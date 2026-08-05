import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Users, Calendar, Sparkles, Trophy } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

const MOBILE_NAV_ITEMS = [
  { id: "roster", label: "Roster", path: "/coach/roster", icon: Users },
  { id: "schedule", label: "Schedule", path: "/coach/schedule", icon: Calendar },
  { id: "ai-reports", label: "AI Reports", path: "/coach/ai-reports", icon: Sparkles, badge: "AI" },
  { id: "events", label: "Events", path: "/coach/events", icon: Trophy },
];

export default function MobileCoachWorkspaceNav() {
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
      gap: 6,
      padding: "8px 12px",
      margin: "0 0 16px 0",
      background: "var(--bg-glass, rgba(15, 23, 42, 0.85))",
      border: "1px solid var(--border-card, rgba(255, 255, 255, 0.08))",
      borderRadius: "16px",
      backdropFilter: "blur(14px)",
      overflowX: "auto",
      scrollbarWidth: "none",
      WebkitOverflowScrolling: "touch",
    }}>
      {MOBILE_NAV_ITEMS.map((item) => {
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
              justifyContent: "center",
              gap: 6,
              flex: 1,
              minWidth: 80,
              padding: "10px 12px",
              borderRadius: 12,
              fontSize: 12,
              fontWeight: isActive ? 800 : 600,
              color: isActive ? "#fff" : "var(--color-text-2, rgba(255,255,255,0.6))",
              textDecoration: "none",
              background: isActive
                ? "linear-gradient(135deg, rgba(6, 182, 212, 0.3) 0%, rgba(59, 130, 246, 0.3) 100%)"
                : "rgba(255, 255, 255, 0.02)",
              border: isActive
                ? "1px solid rgba(6, 182, 212, 0.5)"
                : "1px solid transparent",
              boxShadow: isActive ? "0 0 12px rgba(6, 182, 212, 0.25)" : "none",
              whiteSpace: "nowrap",
              transition: "all 0.2s ease-in-out",
            }}
          >
            <Icon size={15} style={{ color: isActive ? "var(--aura-cyan, #06b6d4)" : "inherit" }} />
            <span>{item.label}</span>
            {item.badge && (
              <span style={{
                fontSize: 8,
                fontWeight: 900,
                padding: "1px 4px",
                borderRadius: 4,
                background: "var(--aura-cyan, #06b6d4)",
                color: "#000",
                lineHeight: 1,
              }}>
                {item.badge}
              </span>
            )}
          </NavLink>
        );
      })}
    </div>
  );
}
