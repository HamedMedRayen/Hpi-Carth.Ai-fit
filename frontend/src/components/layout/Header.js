import React from "react";
import { HpiLogo, SunIcon, MoonIcon } from "../../utils/icons";
import { useTheme } from "../../utils/theme";
import NotificationCenter from "../layout/NotificationCenter";

export default function Header({ title, subtitle, right, showLogo }) {
  const { theme, toggle } = useTheme();
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 30,
      background: "transparent",
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)"
    }}>
      <div style={{
        maxWidth: 960, margin: "0 auto", padding: "16px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <div>
          {showLogo
            ? <HpiLogo size={28} showText />
            : <>
              <div style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif", fontWeight: 700, fontSize: 18, color: "var(--color-text)", lineHeight: 1.2 }}>{title}</div>
              {subtitle && <div style={{ fontSize: 12, color: "var(--color-text-3)", marginTop: 2 }}>{subtitle}</div>}
            </>
          }
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {right}
          <NotificationCenter />
          <button className="theme-toggle mobile-only" onClick={toggle} title="Toggle theme">
            {theme === "dark" ? <SunIcon size={14} /> : <MoonIcon size={14} />}
          </button>
        </div>
      </div>
    </header>
  );
}
