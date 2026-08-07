import React from "react";
import { Edit3, Target, Flame, Utensils, Footprints, Activity } from "lucide-react";

export default function CalorieRingHeader({
  targets,
  foodCalories,
  exerciseBurned,
  remainingCalories,
  todayData,
  onSetGoal,
  onEditGoals
}) {
  const goalKcal = targets?.calories || 2000;
  const eatenKcal = Math.round(foodCalories || 0);
  const burnedKcal = Math.round(exerciseBurned || 0);
  const leftKcal = remainingCalories;

  // Donut ring calculation for central calorie ring
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const pct = goalKcal > 0 ? Math.min(100, (eatenKcal / goalKcal) * 100) : 0;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div
      className="card"
      style={{
        padding: "24px",
        marginBottom: "24px",
        background: "var(--color-bg-card, #0d1117)",
        borderRadius: "24px",
        border: "1px solid var(--color-border, rgba(255,255,255,0.08))"
      }}
    >
      {/* ── Top Bar with Two Goal Buttons: Set Goal (Calculator) & Edit Goal (Direct Input) ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: "var(--color-text-3, #aaa)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Daily Calorie Summary
        </span>

        <div style={{ display: "flex", gap: 8 }}>
          {/* Button 1: Set Goal (Old Questionnaire Form) */}
          <button
            onClick={onSetGoal}
            style={{
              background: "linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)",
              border: "none",
              color: "#000",
              padding: "7px 14px",
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 4px 12px rgba(0, 242, 254, 0.25)"
            }}
          >
            <Target size={14} /> Set Goal (Form)
          </button>

          {/* Button 2: Edit Goal (Direct Quick Edit) */}
          <button
            onClick={onEditGoals}
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#fff",
              padding: "7px 14px",
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <Edit3 size={14} /> Edit Goal
          </button>
        </div>
      </div>

      {/* ── Central Calorie Ring & Eaten / Burned Stats ── */}
      <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", marginBottom: 24 }}>
        {/* Left: Eaten */}
        <div style={{ textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontSize: 12, fontWeight: 700, color: "#aaa", marginBottom: 4 }}>
            <Utensils size={14} color="#ff5252" /> Eaten
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#fff" }}>{eatenKcal}</div>
          <div style={{ fontSize: 11, color: "#aaa" }}>kcal</div>
        </div>

        {/* Center: Large Calorie Left Donut Ring */}
        <div style={{ position: "relative", width: 130, height: 130, cursor: "pointer" }} onClick={onEditGoals}>
          <svg width="130" height="130" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="65" cy="65" r={radius} stroke="rgba(255,255,255,0.08)" strokeWidth="9" fill="transparent" />
            <circle
              cx="65"
              cy="65"
              r={radius}
              stroke={pct >= 100 ? "#ff4d4f" : "#8ce99a"}
              strokeWidth="9"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{
                transition: "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                filter: "drop-shadow(0 0 6px rgba(140, 233, 154, 0.5))"
              }}
            />
          </svg>
          <div style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <span style={{ fontSize: 26, fontWeight: 900, color: leftKcal < 0 ? "#ff4d4f" : "#fff", lineHeight: 1 }}>
              {leftKcal}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#8ce99a", marginTop: 4 }}>kcal left</span>
          </div>
        </div>

        {/* Right: Burned */}
        <div style={{ textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontSize: 12, fontWeight: 700, color: "#aaa", marginBottom: 4 }}>
            <Flame size={14} color="#ff922b" /> Burned
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#fff" }}>{burnedKcal}</div>
          <div style={{ fontSize: 11, color: "#aaa" }}>kcal</div>
        </div>
      </div>

      {/* ── EATEN SECTION: 3 Macro Rings (Carbs, Protein, Fat) ── */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 18, marginBottom: 18 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 14 }}>
          Eaten Macros Breakdown
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
          <MacroCircleItem
            label="Carbs"
            current={todayData?.totals?.carbs_g || 0}
            target={targets?.carbs || 220}
            color="#ff5252"
          />
          <MacroCircleItem
            label="Protein"
            current={todayData?.totals?.protein_g || 0}
            target={targets?.protein || 150}
            color="#ff922b"
          />
          <MacroCircleItem
            label="Fat"
            current={todayData?.totals?.fat_g || 0}
            target={targets?.fat || 65}
            color="#4facfe"
          />
        </div>
      </div>

      {/* ── BURNED SECTION: Walking & Activity ── */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>
          Burned Activity
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
            <Footprints size={18} color="#51cf66" />
            <div>
              <div style={{ fontSize: 11, color: "#aaa" }}>Walking</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>100 <span style={{ fontSize: 10, fontWeight: 400, color: "#aaa" }}>kcal</span></div>
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
            <Activity size={18} color="#ff922b" />
            <div>
              <div style={{ fontSize: 11, color: "#aaa" }}>Workouts</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{burnedKcal} <span style={{ fontSize: 10, fontWeight: 400, color: "#aaa" }}>kcal</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MacroCircleItem({ label, current, target, color }) {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const val = Math.round(current || 0);
  const tgt = Math.round(target || 100);
  const pct = tgt > 0 ? Math.min(100, (val / tgt) * 100) : 0;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ position: "relative", width: 76, height: 76, marginBottom: 6 }}>
        <svg width="76" height="76" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="38" cy="38" r={radius} stroke="rgba(255,255,255,0.08)" strokeWidth="6" fill="transparent" />
          <circle
            cx="38"
            cy="38"
            r={radius}
            stroke={color}
            strokeWidth="6"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{
              transition: "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
              filter: `drop-shadow(0 0 4px ${color}60)`
            }}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 900, color: "#fff" }}>{val}</span>
          <span style={{ fontSize: 9, color: "#aaa" }}>/ {tgt}g</span>
        </div>
      </div>
      <span style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>{label}</span>
    </div>
  );
}
