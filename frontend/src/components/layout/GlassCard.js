import React from "react";

export default function GlassCard({ children, className = "", accent, onClick, noPad }) {
  const pad = noPad ? "" : "p-5";
  return (
    <div
      className={`glass ${onClick ? "glass-hover cursor-pointer" : ""} ${pad} ${className}`}
      onClick={onClick}
      style={accent ? { "--card-accent": accent } : {}}
    >
      {accent && (
        <div style={{
          position: "absolute", top: 0, left: 20, right: 20, height: "1px",
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          borderRadius: 1,
        }} />
      )}
      <div style={{ position: "relative" }}>{children}</div>
    </div>
  );
}
