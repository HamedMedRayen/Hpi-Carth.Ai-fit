import React from "react";
import { NavLink } from "react-router-dom";
import { HomeIcon, ListIcon, PlusIcon, TrendIcon, UserIcon } from "../../utils/icons";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

const tabs = [
  { to: "/", label: "Home", Icon: HomeIcon, end: true },
  { to: "/workouts", label: "Sessions", Icon: ListIcon },
  { to: "/log", label: "Log", Icon: PlusIcon, highlight: true },
  { to: "/progress", label: "Progress", Icon: TrendIcon },
  { to: "/profile", label: "Profile", Icon: UserIcon },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav mobile-only">
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div className="bottom-nav-inner">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", padding: "6px 4px" }}>
            {tabs.map(({ to, label, Icon, end, highlight }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `nav-tab${isActive ? (highlight ? " active-highlight" : " active") : ""}`
                }
                onClick={async () => {
                  if (Capacitor.isNativePlatform()) {
                    try {
                      await Haptics.impact({ style: ImpactStyle.Light });
                    } catch {}
                  }
                }}
              >
                {({ isActive }) => (
                  <>
                    <Icon size={22} active={isActive} />
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
