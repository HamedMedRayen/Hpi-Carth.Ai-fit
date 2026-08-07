import React from "react";

/**
 * Skeleton loading components — shimmer placeholders that match layout shapes.
 * Usage:
 *   <Skeleton.Card />
 *   <Skeleton.StatRow count={4} />
 *   <Skeleton.Text lines={3} />
 *   <Skeleton.Circle size={60} />
 */

function Bone({ width = "100%", height = 16, borderRadius = 8, style = {} }) {
  return (
    <div
      className="skeleton-bone"
      style={{
        width, height, borderRadius,
        background: "var(--bg-glass, rgba(255,255,255,0.05))",
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)",
          animation: "skeleton-shimmer 1.8s ease-in-out infinite",
        }}
      />
    </div>
  );
}

function Card({ height = 120, style = {} }) {
  return (
    <div
      style={{
        background: "var(--bg-card, rgba(15,15,15,0.5))",
        border: "1px solid var(--border-card, rgba(255,255,255,0.05))",
        borderRadius: 16, padding: 20,
        display: "flex", flexDirection: "column", gap: 12,
        ...style,
      }}
    >
      <Bone width="40%" height={12} />
      <Bone width="70%" height={14} />
      <Bone width="55%" height={12} />
      {height > 100 && <Bone width="100%" height={height - 100} borderRadius={12} />}
    </div>
  );
}

function StatRow({ count = 4 }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${count}, 1fr)`, gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            background: "var(--bg-card, rgba(15,15,15,0.5))",
            border: "1px solid var(--border-card, rgba(255,255,255,0.05))",
            borderRadius: 16, padding: 20,
            display: "flex", flexDirection: "column", gap: 10,
          }}
        >
          <Bone width="60%" height={10} />
          <Bone width="40%" height={24} />
          <Bone width="45%" height={10} />
        </div>
      ))}
    </div>
  );
}

function Text({ lines = 3, style = {} }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, ...style }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Bone key={i} width={i === lines - 1 ? "60%" : "100%"} height={13} />
      ))}
    </div>
  );
}

function Circle({ size = 60, style = {} }) {
  return <Bone width={size} height={size} borderRadius="50%" style={style} />;
}

function ListItem({ count = 3 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: "12px 16px", borderRadius: 12,
            background: "var(--bg-card, rgba(15,15,15,0.5))",
            border: "1px solid var(--border-card, rgba(255,255,255,0.05))",
          }}
        >
          <Bone width={40} height={40} borderRadius={10} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <Bone width="50%" height={13} />
            <Bone width="30%" height={10} />
          </div>
          <Bone width={60} height={18} borderRadius={6} />
        </div>
      ))}
    </div>
  );
}

function Dashboard() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Bone width={120} height={12} />
          <Bone width={200} height={26} />
        </div>
        <Bone width={140} height={40} borderRadius={12} />
      </div>
      <StatRow count={4} />
      <Card height={80} />
      <Card height={180} />
    </div>
  );
}

const Skeleton = { Bone, Card, StatRow, Text, Circle, ListItem, Dashboard };
export default Skeleton;

// Global skeleton shimmer animation — also added via style tag
export function SkeletonStyles() {
  return (
    <style>{`
      @keyframes skeleton-shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
    `}</style>
  );
}
