import React, { useState, useEffect } from "react";
import { CheckCircle, Trophy } from "lucide-react";
import { api } from "../../utils/api";

export default function StreakTrackerWidget() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStreak().then(res => {
      setData(res);
      setLoading(false);
    }).catch(e => { console.error(e); setLoading(false); });
  }, []);

  if (loading) return <div style={{ height: 100, borderRadius: 10, background: 'var(--bg-card-hover)', animation: 'pulse 1.5s ease-in-out infinite' }} />;

  const weekLabels = ["M", "T", "W", "T", "F", "S", "S"];
  const weekBools = data.week || [false, false, false, false, false, false, false];

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 80 }}>
        <div style={{ fontSize: 48, fontWeight: 800, color: "var(--aura-accent2)", lineHeight: 1 }}>{data.current_streak || 0}</div>
        <div style={{ fontSize: 13, color: "var(--color-text-2)", marginTop: 4 }}>day streak</div>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        {weekBools.map((trained, i) => {
          const isToday = i === new Date().getDay() - 1 || (new Date().getDay() === 0 && i === 6);
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              {trained ? (
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--aura-accent2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <CheckCircle size={14} color="var(--color-on-accent)" />
                </div>
              ) : isToday ? (
                <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid var(--aura-accent2)", animation: "streakPulse 2s infinite" }}>
                  <style>{`@keyframes streakPulse { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--aura-accent2) 40%, transparent); } 70% { box-shadow: 0 0 0 6px transparent; } 100% { box-shadow: 0 0 0 0 transparent; } }`}</style>
                </div>
              ) : (
                <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid var(--color-border)", background: "transparent" }} />
              )}
              <div style={{ fontSize: 10, color: "var(--color-text-3)", fontWeight: 600 }}>{weekLabels[i]}</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: "var(--color-surface)", borderRadius: 8 }}>
        <Trophy size={14} color="var(--color-text-2)" />
        <span style={{ fontSize: 13, color: "var(--color-text-2)" }}>Best streak: {data.best_streak || 0} days</span>
      </div>
    </div>
  );
}
