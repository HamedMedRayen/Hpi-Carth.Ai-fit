import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Flame, Utensils, ArrowUpRight } from "lucide-react";
import { api } from "../../utils/api";

export default function CalorieRingWidget() {
  const navigate = useNavigate();
  const [targets, setTargets] = useState({ calories: 2000, protein: 150, carbs: 220, fat: 65 });
  const [today, setToday] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      api.getLatestNutritionTargets().catch(() => null),
      api.getNutritionToday().catch(() => null),
    ]).then(([tgtRes, todayRes]) => {
      if (!isMounted) return;
      if (tgtRes) {
        setTargets({
          calories: tgtRes.calories || 2000,
          protein: tgtRes.protein_g || 150,
          carbs: tgtRes.carbs_g || 220,
          fat: tgtRes.fat_g || 65,
        });
      }
      if (todayRes) {
        const meals = todayRes.meals || todayRes.logs || [];
        const totalKcal = Math.round(meals.reduce((sum, m) => sum + (m.calories || 0), 0));
        const totalP = Math.round(meals.reduce((sum, m) => sum + (m.protein_g || 0), 0));
        const totalC = Math.round(meals.reduce((sum, m) => sum + (m.carbs_g || 0), 0));
        const totalF = Math.round(meals.reduce((sum, m) => sum + (m.fat_g || 0), 0));
        setToday({ calories: totalKcal, protein: totalP, carbs: totalC, fat: totalF });
      }
      setLoading(false);
    });
    return () => { isMounted = false; };
  }, []);

  const goalKcal = targets.calories || 2000;
  const eatenKcal = today.calories || 0;
  const remainingKcal = Math.max(0, goalKcal - eatenKcal);

  // SVG Ring calculation
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const pct = goalKcal > 0 ? Math.min(100, (eatenKcal / goalKcal) * 100) : 0;
  const offset = circumference - (pct / 100) * circumference;

  const macros = [
    { label: "Protein", current: today.protein, target: targets.protein, color: "#ff922b", unit: "g" },
    { label: "Carbs", current: today.carbs, target: targets.carbs, color: "#ff5252", unit: "g" },
    { label: "Fat", current: today.fat, target: targets.fat, color: "#4facfe", unit: "g" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, height: "100%" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255, 146, 43, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ff922b" }}>
            <Flame size={15} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)" }}>Calories & Macros</div>
            <div style={{ fontSize: 11, color: "var(--color-text-3)" }}>Daily Target: {goalKcal} kcal</div>
          </div>
        </div>
        <button
          onClick={() => navigate("/nutrition")}
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            padding: "4px 8px",
            color: "var(--color-text-2)",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          Diary <ArrowUpRight size={12} />
        </button>
      </div>

      {/* Main Center Layout: Ring + Macro Bars */}
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        {/* Ring */}
        <div style={{ position: "relative", width: 92, height: 92, flexShrink: 0 }}>
          <svg width="92" height="92" style={{ transform: "rotate(-90deg)" }}>
            <circle
              cx="46"
              cy="46"
              r={radius}
              stroke="var(--color-border, rgba(255,255,255,0.08))"
              strokeWidth="7"
              fill="transparent"
            />
            <circle
              cx="46"
              cy="46"
              r={radius}
              stroke={pct >= 100 ? "#ff4d4f" : "#8ce99a"}
              strokeWidth="7"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{
                transition: "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                filter: `drop-shadow(0 0 6px ${pct >= 100 ? "rgba(255, 77, 79, 0.4)" : "rgba(140, 233, 154, 0.4)"})`,
              }}
            />
          </svg>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 900, color: "var(--color-text)", lineHeight: 1 }}>
              {remainingKcal}
            </span>
            <span style={{ fontSize: 9, fontWeight: 700, color: "#8ce99a", marginTop: 2 }}>
              kcal left
            </span>
          </div>
        </div>

        {/* Macro Progress Bars */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          {macros.map((m) => {
            const mPct = m.target > 0 ? Math.min(100, Math.round((m.current / m.target) * 100)) : 0;
            return (
              <div key={m.label}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 600, marginBottom: 3 }}>
                  <span style={{ color: "var(--color-text-2)" }}>{m.label}</span>
                  <span style={{ color: "var(--color-text-3)", fontSize: 10 }}>
                    <strong style={{ color: "var(--color-text)" }}>{m.current}</strong> / {m.target}{m.unit}
                  </span>
                </div>
                <div style={{ height: 6, width: "100%", background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${mPct}%`,
                      background: m.color,
                      borderRadius: 4,
                      transition: "width 0.6s ease",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer / Quick Log Button */}
      <button
        onClick={() => navigate("/nutrition")}
        style={{
          width: "100%",
          padding: "8px",
          borderRadius: 10,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid var(--color-border)",
          color: "var(--color-text-2)",
          fontSize: 11,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          cursor: "pointer",
          transition: "all 0.15s ease",
        }}
      >
        <Utensils size={13} color="#ff922b" /> Log Food / Scan Meal
      </button>
    </div>
  );
}
