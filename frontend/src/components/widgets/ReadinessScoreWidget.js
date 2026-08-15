import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, Activity, AlertCircle, Heart, ChevronRight } from "lucide-react";
import { api } from "../../utils/api";

export default function ReadinessScoreWidget() {
  const navigate = useNavigate();
  const [score, setScore] = useState(85);
  const [status, setStatus] = useState("Optimal");
  const [color, setColor] = useState("#10B981");
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState({ fatigueLevel: 3, activeInjuries: 0 });

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      api.getFatigueHistory().catch(() => []),
      api.getInjuries().catch(() => []),
    ]).then(([fatigueRes, injuriesRes]) => {
      if (!isMounted) return;
      const latestFatigue = Array.isArray(fatigueRes) && fatigueRes.length > 0 ? fatigueRes[0] : null;
      const fatigueVal = latestFatigue ? (latestFatigue.overall_fatigue || latestFatigue.score || 3) : 3;
      const activeInjuries = Array.isArray(injuriesRes) ? injuriesRes.filter((i) => i.status === "active").length : 0;

      // Score formula: Base 100 - (fatigue * 7) - (injuries * 15)
      let calcScore = Math.max(10, Math.min(100, Math.round(100 - (fatigueVal * 7) - (activeInjuries * 15))));

      let st = "Optimal";
      let clr = "#10B981"; // Emerald
      if (calcScore >= 80) {
        st = "Prime / Max Output";
        clr = "#10B981";
      } else if (calcScore >= 60) {
        st = "Good / Hypertrophy";
        clr = "#3B82F6"; // Blue
      } else if (calcScore >= 40) {
        st = "Moderate / Maintenance";
        clr = "#F59E0B"; // Amber
      } else {
        st = "Recovery Priority";
        clr = "#EF4444"; // Red
      }

      setScore(calcScore);
      setStatus(st);
      setColor(clr);
      setDetails({ fatigueLevel: fatigueVal, activeInjuries });
      setLoading(false);
    });
    return () => { isMounted = false; };
  }, []);

  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(16, 185, 129, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#10B981" }}>
            <Zap size={15} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)" }}>Daily Readiness</div>
            <div style={{ fontSize: 11, color: "var(--color-text-3)" }}>CNS & Muscle Recovery</div>
          </div>
        </div>
        <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 20, background: `color-mix(in srgb, ${color} 15%, transparent)`, color: color }}>
          {status}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* Dial */}
        <div style={{ position: "relative", width: 92, height: 92, flexShrink: 0 }}>
          <svg width="92" height="92" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="46" cy="46" r={radius} stroke="var(--color-border, rgba(255,255,255,0.08))" strokeWidth="7" fill="transparent" />
            <circle
              cx="46"
              cy="46"
              r={radius}
              stroke={color}
              strokeWidth="7"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{
                transition: "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                filter: `drop-shadow(0 0 6px ${color}60)`,
              }}
            />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 20, fontWeight: 900, color: "var(--color-text)", lineHeight: 1 }}>
              {score}%
            </span>
            <span style={{ fontSize: 8, fontWeight: 700, color: "var(--color-text-3)", marginTop: 2 }}>
              READY
            </span>
          </div>
        </div>

        {/* Breakdown details */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11 }}>
            <span style={{ color: "var(--color-text-3)", display: "flex", alignItems: "center", gap: 4 }}>
              <Heart size={12} color="#ec4899" /> Fatigue Level
            </span>
            <span style={{ fontWeight: 700, color: "var(--color-text)" }}>{details.fatigueLevel}/10</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11 }}>
            <span style={{ color: "var(--color-text-3)", display: "flex", alignItems: "center", gap: 4 }}>
              <AlertCircle size={12} color="#ff5252" /> Active Injuries
            </span>
            <span style={{ fontWeight: 700, color: details.activeInjuries > 0 ? "#ff5252" : "var(--color-text)" }}>
              {details.activeInjuries}
            </span>
          </div>
          <div style={{ fontSize: 10, color: "var(--color-text-3)", marginTop: 2, lineHeight: 1.3 }}>
            {score >= 75
              ? "Neuromuscular state is primed for progressive overload today."
              : "Moderate recovery. Stay hydrated and control rest periods."}
          </div>
        </div>
      </div>

      <button
        onClick={() => navigate("/fatigue-check")}
        style={{
          width: "100%",
          padding: "7px",
          borderRadius: 8,
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
        }}
      >
        <Activity size={13} color="#10B981" /> Take Fatigue Check-in
      </button>
    </div>
  );
}
