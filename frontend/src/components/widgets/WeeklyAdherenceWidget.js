import React, { useState, useEffect } from "react";
import { Calendar, Check, Zap, Target } from "lucide-react";
import { api } from "../../utils/api";

export default function WeeklyAdherenceWidget() {
  const [streak, setStreak] = useState(0);
  const [completedDays, setCompletedDays] = useState([false, false, false, false, false, false, false]);
  const [targetWorkouts, setTargetWorkouts] = useState(5);
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      api.getStreak().catch(() => null),
      api.getActivityMap().catch(() => []),
    ]).then(([streakRes, actRes]) => {
      if (!isMounted) return;
      if (streakRes) {
        setStreak(streakRes.current_streak || streakRes.current_streak_days || 0);
      }

      // Calculate days completed for the current week (Monday to Sunday)
      const now = new Date();
      const currentDay = (now.getDay() + 6) % 7; // Monday = 0
      const days = [false, false, false, false, false, false, false];

      if (Array.isArray(actRes)) {
        // Map recent activities by date string YYYY-MM-DD
        const activeDates = new Set(actRes.filter((a) => (a.volume || a.count || 0) > 0).map((a) => String(a.date).slice(0, 10)));
        
        for (let i = 0; i <= currentDay; i++) {
          const d = new Date();
          d.setDate(now.getDate() - (currentDay - i));
          const ds = d.toISOString().slice(0, 10);
          if (activeDates.has(ds)) {
            days[i] = true;
          }
        }
      }

      // If user has streak > 0, make sure today is checked if they worked out
      if (streakRes?.last_workout_date === now.toISOString().slice(0, 10)) {
        days[currentDay] = true;
      }

      setCompletedDays(days);
      const count = days.filter(Boolean).length;
      setCompletedCount(count);
    });
    return () => { isMounted = false; };
  }, []);

  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const currentDayIndex = (new Date().getDay() + 6) % 7;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(139, 92, 246, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--aura-accent, #8b5cf6)" }}>
            <Calendar size={15} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)" }}>Weekly Adherence</div>
            <div style={{ fontSize: 11, color: "var(--color-text-3)" }}>Goal: {targetWorkouts} sessions / week</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(6, 182, 212, 0.1)", padding: "3px 8px", borderRadius: 12, color: "var(--aura-cyan, #06b6d4)", fontSize: 11, fontWeight: 800 }}>
          <Zap size={12} /> {streak}d Streak
        </div>
      </div>

      {/* 7-Day Week Strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
        {dayLabels.map((label, idx) => {
          const isDone = completedDays[idx];
          const isToday = idx === currentDayIndex;
          return (
            <div
              key={label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                padding: "8px 2px",
                borderRadius: 10,
                background: isDone
                  ? "color-mix(in srgb, var(--aura-accent, #8b5cf6) 20%, transparent)"
                  : isToday
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(255,255,255,0.02)",
                border: isToday
                  ? "1px solid var(--aura-accent, #8b5cf6)"
                  : isDone
                  ? "1px solid color-mix(in srgb, var(--aura-accent, #8b5cf6) 40%, transparent)"
                  : "1px solid var(--color-border)",
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 700, color: isToday ? "var(--aura-accent)" : "var(--color-text-3)" }}>
                {label}
              </span>
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: isDone ? "var(--aura-accent, #8b5cf6)" : "transparent",
                  border: isDone ? "none" : "1.5px dashed var(--color-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                }}
              >
                {isDone && <Check size={12} strokeWidth={3} />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "var(--color-text-3)" }}>
        <span>{completedCount} of {targetWorkouts} planned sessions done</span>
        <span style={{ fontWeight: 700, color: completedCount >= targetWorkouts ? "#10B981" : "var(--color-text-2)" }}>
          {Math.round((completedCount / targetWorkouts) * 100)}% on track
        </span>
      </div>
    </div>
  );
}
