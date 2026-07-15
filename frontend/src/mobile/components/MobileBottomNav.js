import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Home, Dumbbell, Apple, Activity, Users } from "lucide-react";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: Home },
  { path: "/workouts", label: "Workout", icon: Dumbbell },
  { path: "/nutrition", label: "Nutrition", icon: Apple },
  { path: "/progress", label: "Progress", icon: Activity },
  { path: "/coach", label: "Coach", icon: Users },
];

export default function MobileBottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleNav = async (path) => {
    if (pathname === path) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {
      // Ignore if haptics fail
    }
    navigate(path);
  };

  return (
    <nav className="mobile-bottom-nav">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.path || (item.path !== "/" && pathname.startsWith(item.path));
        return (
          <button
            key={item.path}
            className={`mobile-nav-item ${isActive ? "active" : ""}`}
            onClick={() => handleNav(item.path)}
          >
            <div className="mobile-nav-icon-wrapper">
              <item.icon size={22} className="mobile-nav-icon" />
              {isActive && <div className="mobile-nav-indicator" />}
            </div>
            <span className="mobile-nav-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
