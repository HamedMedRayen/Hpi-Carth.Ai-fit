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

  if (loading) return <div style={{ height: 180, borderRadius: 10, background: 'var(--bg-card-hover)', animation: 'pulse 1.5s ease-in-out infinite' }} />;

  const today = new Date();
  const days = [];
  // Show 12 weeks (84 days)
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d);
  }

  const volumeMap = {};
  data.forEach(d => { volumeMap[d.date] = d.volume; });

  const getCellColor = (volume) => {
    if (!volume) return 'var(--color-bg3)';
    
    // We use rgba to derive shades from the theme's accent color
    // This ensures it looks premium on ALL themes (Nature, Queen, Dark, etc.)
    if (volume < 500)  return 'rgba(var(--aura-accent-rgb), 0.2)';
    if (volume < 1500) return 'rgba(var(--aura-accent-rgb), 0.45)';
    if (volume < 3000) return 'rgba(var(--aura-accent-rgb), 0.7)';
    return 'var(--aura-accent)';
  };

  const activeDays = data.filter(d => d.sessions > 0).length;

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  // Group days into weeks for rendering
  const weeks = [];
  for (let i = 0; i < 12; i++) {
    weeks.push(days.slice(i * 7, (i + 1) * 7));
  }

  return (
    <div style={{ width: "100%" }}>
      {/* Month Labels Row */}
      <div style={{ display: "flex", gap: 4, marginBottom: 8, paddingLeft: 0 }}>
        {weeks.map((week, weekIdx) => {
          const firstDay = week[0];
          const isFirstDayOfMonth = firstDay.getDate() <= 7;
          const showMonth = weekIdx === 0 || isFirstDayOfMonth;
          
          return (
            <div key={weekIdx} style={{ width: 14, fontSize: 10, color: "var(--color-text-3)", fontWeight: 700, textTransform: "uppercase" }}>
              {showMonth ? monthNames[firstDay.getMonth()] : ""}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 10 }}>
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {week.map((d, dayIdx) => {
              const dateStr = d.toISOString().split("T")[0];
              const vol = volumeMap[dateStr] || 0;
              return (
                <div
                  key={dayIdx}
                  title={`${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} — ${Math.round(vol)} kg volume`}
                  style={{
                    width: 14, height: 14, borderRadius: 3,
                    background: getCellColor(vol),
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)", 
                    cursor: "pointer"
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = "scale(1.2)";
                    e.currentTarget.style.zIndex = "10";
                    e.currentTarget.style.boxShadow = "0 0 10px var(--aura-accent)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.zIndex = "1";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--color-text-3)", fontWeight: 600 }}>
          <span>Less</span>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: "var(--color-bg3)" }} />
          <div style={{ width: 10, height: 10, borderRadius: 2, background: "rgba(var(--aura-accent-rgb), 0.2)" }} />
          <div style={{ width: 10, height: 10, borderRadius: 2, background: "rgba(var(--aura-accent-rgb), 0.45)" }} />
          <div style={{ width: 10, height: 10, borderRadius: 2, background: "rgba(var(--aura-accent-rgb), 0.7)" }} />
          <div style={{ width: 10, height: 10, borderRadius: 2, background: "var(--aura-accent)" }} />
          <span>More</span>
        </div>
        <div style={{ fontSize: 11, color: "var(--color-text-3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {activeDays} active days
        </div>
      </div>
    </div>
  );
}
