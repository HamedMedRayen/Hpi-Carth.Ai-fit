import React, { useState, useEffect } from "react";
import { api } from "../../utils/api";
import { useChartColors } from "../../hooks/useChartColors";
import { useTheme } from '../../utils/theme';

export default function ActivityMapWidget() {
  const cc = useChartColors();
  const { theme } = useTheme();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getActivityMap().then(res => {
      setData(res);
      setLoading(false);
    }).catch(e => { console.error(e); setLoading(false); });
  }, []);

  if (loading) return <div style={{ height: 140, borderRadius: 10, background: 'var(--bg-card-hover)', animation: 'pulse 1.5s ease-in-out infinite' }} />;

  const today = new Date();
  const days = [];
  const NUM_DAYS = 35; // 5 weeks (7 columns x 5 rows grid box)

  for (let i = NUM_DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d);
  }

  const volumeMap = {};
  data.forEach(d => { volumeMap[d.date] = d.volume; });

  const getCellColor = (volume) => {
    if (!volume) return 'var(--color-bg3)';
    if (volume < 500)  return 'rgba(var(--aura-accent-rgb), 0.25)';
    if (volume < 1500) return 'rgba(var(--aura-accent-rgb), 0.5)';
    if (volume < 3000) return 'rgba(var(--aura-accent-rgb), 0.75)';
    return 'var(--aura-accent)';
  };

  const activeDays = data.filter(d => d.sessions > 0).length;
  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
      {/* 7-Column Day Header Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, textAlign: "center" }}>
        {dayLabels.map((lbl, i) => (
          <span key={i} style={{ fontSize: 10, fontWeight: 800, color: "var(--color-text-3)" }}>
            {lbl}
          </span>
        ))}
      </div>

      {/* 7-Column Activity Grid Box */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, justifyItems: "center" }}>
        {days.map((d, idx) => {
          const dateStr = d.toISOString().split("T")[0];
          const vol = volumeMap[dateStr] || 0;
          return (
            <div
              key={idx}
              title={`${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — ${Math.round(vol)} kg`}
              style={{
                width: "100%",
                aspectRatio: "1",
                maxWidth: 24,
                borderRadius: 4,
                background: getCellColor(vol),
                transition: "all 0.2s ease",
                cursor: "pointer"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "scale(1.15)";
                e.currentTarget.style.boxShadow = "0 0 8px var(--aura-accent)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          );
        })}
      </div>

      {/* Compact Footer Legend */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--color-text-3)", fontWeight: 600 }}>
          <span>Less</span>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: "var(--color-bg3)" }} />
          <div style={{ width: 8, height: 8, borderRadius: 2, background: "rgba(var(--aura-accent-rgb), 0.3)" }} />
          <div style={{ width: 8, height: 8, borderRadius: 2, background: "var(--aura-accent)" }} />
          <span>More</span>
        </div>
        <span style={{ fontSize: 10, color: "var(--color-text-3)", fontWeight: 700 }}>
          {activeDays} Active Days
        </span>
      </div>
    </div>
  );
}
