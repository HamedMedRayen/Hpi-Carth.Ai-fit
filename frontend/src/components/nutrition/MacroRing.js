import React from "react";

export default function MacroRing({ value, target, color, label, unit }) {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{ position: "relative", width: 72, height: 72 }}>
        <svg width="72" height="72" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="36" cy="36" r={radius} stroke="rgba(255,255,255,0.06)" strokeWidth="6" fill="transparent" />
          <circle
            cx="36"
            cy="36"
            r={radius}
            stroke={color}
            strokeWidth="6"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{
              transition: "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
              filter: `drop-shadow(0 0 4px ${color}80)`
            }}
          />
        </svg>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>{Math.round(value || 0)}</span>
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{unit}</span>
        </div>
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>{label}</span>
    </div>
  );
}

