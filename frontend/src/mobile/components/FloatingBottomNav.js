import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Home, Dumbbell, Apple, Activity, User } from "lucide-react";
import "../styles/mobile.css";

const NAV_ITEMS = [
  { path: "/", label: "Home", icon: Home },
  { path: "/workouts", label: "Train", icon: Dumbbell },
  { path: "/nutrition", label: "Nutrition", icon: Apple },
  { path: "/body", label: "Body", icon: Activity },
  { path: "/you", label: "You", icon: User },
];

export default function FloatingBottomNav() {
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
    <nav className="floating-bottom-nav-container">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.path || (item.path !== "/" && pathname.startsWith(item.path));
        return (
          <button
            key={item.path}
            className={`floating-nav-item ${isActive ? "active" : ""}`}
            onClick={() => handleNav(item.path)}
          >
            <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
            {isActive && (
              <span style={{ fontSize: 11, fontWeight: 700, marginLeft: 6 }}>
                {item.label}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
