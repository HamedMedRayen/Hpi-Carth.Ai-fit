import React from "react";
import { useTheme } from "./theme";

const Icon = ({ d, size = 20, stroke = "currentColor", fill = "none", ...rest }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24"
    fill={fill} stroke={stroke} strokeWidth="1.6"
    strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0, display: "block" }}
    {...rest}
  >
    {Array.isArray(d)
      ? d.map((path, i) => <path key={i} d={path} />)
      : <path d={d} />}
  </svg>
);

// ── Navigation ────────────────────────────────────────────────
export const HomeIcon = ({ size, active }) => (
  <Icon size={size} fill={active ? "currentColor" : "none"}
    d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z" />
);

export const ListIcon = ({ size, active }) => (
  <Icon size={size} fill={active ? "currentColor" : "none"}
    d={[
      "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2",
      "M9 5a2 2 0 012-2h2a2 2 0 012 2v0a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
      "M9 12h6M9 16h4"
    ]}
  />
);

export const PlusIcon = ({ size }) => (
  <Icon size={size} d="M12 5v14M5 12h14" />
);

export const TrendIcon = ({ size, active }) => (
  <Icon size={size} fill={active ? "currentColor" : "none"}
    d="M2 18l6.5-7 4 4.5 4-5 5.5 5" />
);

export const BarChartIcon = ({ size, active }) => (
  <Icon size={size} fill={active ? "currentColor" : "none"}
    d={[
      "M3 3v18h18",
      "M7 16v-4M12 16V8M17 16v-7"
    ]}
  />
);

export const UserIcon = ({ size, active }) => (
  <Icon size={size} fill={active ? "currentColor" : "none"}
    d={[
      "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2",
      "M12 3a4 4 0 110 8 4 4 0 010-8z"
    ]}
  />
);

// ── Stats & metrics ───────────────────────────────────────────
export const WeightIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0 }}>
    <path d="M6 7a2 2 0 114 0v1H6V7z" />
    <path d="M14 7a2 2 0 114 0v1h-4V7z" />
    <rect x="3" y="8" width="18" height="3" rx="1.5" />
    <rect x="9" y="11" width="6" height="8" rx="1" />
  </svg>
);

export const FireIcon = ({ size = 20 }) => (
  <Icon size={size}
    d="M12 2c0 6-6 6-6 12a6 6 0 0012 0c0-3-1.5-5-3-6.5C14 9.5 12 8 12 2zM9.5 14c0 1.4 1.1 2.5 2.5 2.5" />
);

export const ClockIcon = ({ size = 20 }) => (
  <Icon size={size} d={["M12 2a10 10 0 110 20A10 10 0 0112 2z", "M12 6v6l4 2"]} />
);

export const BoltIcon = ({ size = 20 }) => (
  <Icon size={size} d="M13 2L4.5 13.5H12L11 22l8.5-11.5H12L13 2z" />
);

export const ZapIcon = ({ size = 20 }) => (
  <Icon size={size} d="M13 2l-8 10h6l-1 8 8-11h-6l1-7z" />
);

export const TrophyIcon = ({ size = 20 }) => (
  <Icon size={size}
    d={[
      "M8 21h8M12 17v4",
      "M6 3H3v5a9 9 0 006 8.5A9 9 0 0021 8V3h-3",
      "M6 3h12v5a6 6 0 01-12 0V3z"
    ]}
  />
);

export const DiamondIcon = ({ size = 20 }) => (
  <Icon size={size}
    d={["M2.5 9.5L12 2l9.5 7.5L12 22 2.5 9.5z", "M2.5 9.5h19L16 3H8L2.5 9.5z"]} />
);

export const CalendarIcon = ({ size = 20 }) => (
  <Icon size={size}
    d={[
      "M8 2v3M16 2v3",
      "M3 8h18",
      "M5 4h14a2 2 0 012 2v13a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"
    ]}
  />
);

export const ChartIcon = ({ size = 20 }) => (
  <Icon size={size}
    d={["M3 3v18h18", "M7 12l4-4 4 4 4-6"]} />
);

export const DnaIcon = ({ size = 20 }) => (
  <Icon size={size}
    d={[
      "M5 3c0 4.5 14 4.5 14 9S5 16.5 5 21",
      "M19 3c0 4.5-14 4.5-14 9s14 4.5 14 9",
    ]}
  />
);

export const BrainIcon = ({ size = 20 }) => (
  <Icon size={size}
    d="M12 5a7 7 0 017 7 4.5 4.5 0 01-4.5 4.5H12m0-11.5a7 7 0 00-7 7A4.5 4.5 0 009.5 16.5H12M12 5v11.5M9 8.5c0-1.1.9-2 2-2M15 8.5c0-1.1-.9-2-2-2" />
);

export const ScatterIcon = ({ size = 20 }) => (
  <Icon size={size}
    d={[
      "M3 3v18h18",
      "M7 14a1 1 0 110-2 1 1 0 010 2zM13 9a1 1 0 110-2 1 1 0 010 2zM17 13a1 1 0 110-2 1 1 0 010 2zM10 17a1 1 0 110-2 1 1 0 010 2z"
    ]}
  />
);

export const TreeIcon = ({ size = 20 }) => (
  <Icon size={size}
    d={[
      "M12 2l3 6h3l-4 4 1.5 5L12 14l-3.5 3 1.5-5-4-4h3L12 2z"
    ]}
  />
);

// ── Actions ───────────────────────────────────────────────────
export const SearchIcon = ({ size = 18 }) => (
  <Icon size={size} d={["M11 19A8 8 0 1011 3a8 8 0 000 16z", "M21 21l-4.35-4.35"]} />
);

export const BackIcon = ({ size = 20 }) => (
  <Icon size={size} d="M19 12H5M12 5l-7 7 7 7" />
);

export const CloseIcon = ({ size = 18 }) => (
  <Icon size={size} d="M18 6L6 18M6 6l12 12" />
);

export const CheckIcon = ({ size = 20 }) => (
  <Icon size={size} d="M20 6L9 17l-5-5" />
);

export const ChevronDownIcon = ({ size = 16 }) => (
  <Icon size={size} d="M6 9l6 6 6-6" />
);

export const ChevronUpIcon = ({ size = 16 }) => (
  <Icon size={size} d="M18 15l-6-6-6 6" />
);

export const SunIcon = ({ size = 18 }) => (
  <Icon size={size}
    d={[
      "M12 7a5 5 0 110 10A5 5 0 0112 7z",
      "M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
    ]}
  />
);

export const MoonIcon = ({ size = 18 }) => (
  <Icon size={size} d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
);

export const InfoIcon = ({ size = 16 }) => (
  <Icon size={size}
    d={["M12 2a10 10 0 110 20A10 10 0 0112 2z", "M12 8v4M12 16h.01"]} />
);

export const AlertIcon = ({ size = 20 }) => (
  <Icon size={size}
    d={["M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z", "M12 9v4M12 17h.01"]}
  />
);

// ── App logo — HPI ───────────────────────────────────────────
export function HpiLogo({ size = 32, showText = true, style = {}, forceWhite = false }) {
  let activeTheme = "dark";
  try {
    const themeCtx = useTheme();
    activeTheme = themeCtx.previewTheme || themeCtx.theme || "dark";
  } catch (e) {
    if (typeof document !== "undefined") {
      activeTheme = document.documentElement.getAttribute("data-theme") || "dark";
    }
  }

  const isLight = activeTheme === "light";
  
  // If the size is moderate/large (e.g. Auth page or Welcome screen hero logo), render the full premium horizontal brand logo
  if (size >= 35) {
    return (
      <img 
        src="/logo/hpi-logo-transparent.png" 
        alt="HPI Logo" 
        style={{
          height: size,
          width: "auto",
          display: "block",
          objectFit: "contain",
          filter: forceWhite ? "brightness(0) invert(1)" : (isLight ? "none" : "invert(1)"),
          WebkitFilter: forceWhite ? "brightness(0) invert(1)" : (isLight ? "none" : "invert(1)"),
          ...style
        }}
        className={`hpi-logo-img ${forceWhite ? "hpi-logo-img-white" : ""}`}
      />
    );
  }

  // For smaller dimensions (headers, sub-menus, login cards), render the dynamic-colored high-res brushstroke emblem and clean Sora text
  return (
    <div className="HpiLogo" style={{ display: "inline-flex", alignItems: "center", gap: size * 0.3, verticalAlign: "middle", ...style }}>
      <div style={{
        width: size,
        height: size,
        flexShrink: 0,
        backgroundColor: "var(--aura-accent)",
        WebkitMaskImage: "url(/hpi-app-icon-512.png)",
        WebkitMaskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskImage: "url(/hpi-app-icon-512.png)",
        maskSize: "contain",
        maskRepeat: "no-repeat",
        maskPosition: "center",
      }} />
      {showText && (
        <span style={{
          fontFamily: "'Sora', var(--font-display), system-ui, sans-serif",
          fontWeight: 800,
          fontSize: size * 0.65,
          letterSpacing: "0.06em",
          color: "var(--color-text)",
          lineHeight: 1,
        }}>
          HPI
        </span>
      )}
    </div>
  );
}

// Backward-compatible alias
export const AuraLogo = HpiLogo;

export const TrashIcon = ({ size = 16 }) => (
  <Icon size={size} d={[
    "M3 6h18M8 6V4h8v2",
    "M19 6l-1 14H6L5 6"
  ]} />
);
