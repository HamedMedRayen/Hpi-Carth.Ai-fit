import React from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle, Zap, AlertTriangle, XCircle, ChevronRight, RotateCcw, Ban
} from "lucide-react";

const LEVEL_CONFIG = {
  None: { color: "#22C55E", Icon: CheckCircle, label: "None" },
  Mild: { color: "#EAB308", Icon: Zap, label: "Mild" },
  Moderate: { color: "#F97316", Icon: AlertTriangle, label: "Moderate" },
  Severe: { color: "#EF4444", Icon: XCircle, label: "Severe" },
};

export default function FatigueResult({ result, onRetake }) {
  if (!result) return null;

  const conf = LEVEL_CONFIG[result.label] || LEVEL_CONFIG.None;
  const LevelIcon = conf.Icon;
  const borgPct = Math.min(Math.max(((result.borgScore - 6) / 14) * 100, 0), 100);

  const getAdvice = (label) => {
    switch (label) {
      case "None":
        return {
          title: "You're Fresh — Go Hard",
          body: "Your body is well-recovered. This is the ideal time for a high-intensity session, a new PR attempt, or a heavy compound lift day.",
          action: { icon: ChevronRight, text: "Start a Session", link: "/log" }
        };
      case "Mild":
        return {
          title: "Light Fatigue — Train Smart",
          body: "You have some fatigue but it's manageable. Stick to your planned workout but avoid maximal efforts. Focus on technique over load. Stay hydrated.",
          action: { icon: ChevronRight, text: "Log a Workout", link: "/log" }
        };
      case "Moderate":
        return {
          title: "Significant Fatigue — Reduce Intensity",
          body: "Drop volume by 30–40%, swap heavy lifts for accessory work, or do a mobility session. Prioritize 8h sleep tonight.",
          action: { icon: ChevronRight, text: "View Stretching", link: "/exercises?category=cardio" }
        };
      case "Severe":
        return {
          title: "High Fatigue — Rest is Training",
          body: "Training hard today risks injury and overtraining syndrome. Take a full rest day, focus on nutrition, and aim for 8–9h sleep.",
          action: { icon: Ban, text: "Rest Today", disabled: true }
        };
      default:
        return { title: "", body: "", action: null };
    }
  };

  const advice = getAdvice(result.label);
  const ActionIcon = advice.action?.icon;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", animation: "fadeIn 0.3s ease", paddingBottom: 40 }}>
      <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>

      {/* 1. Level Badge */}
      <div style={{
        width: 96, height: 96, borderRadius: "50%", border: `3px solid ${conf.color}`,
        background: `color-mix(in srgb, ${conf.color} 10%, transparent)`,
        display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20
      }}>
        <LevelIcon size={40} color={conf.color} />
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: conf.color, marginBottom: 4 }}>{conf.label}</div>
      <div style={{ fontSize: 14, color: "var(--color-text-2)", marginBottom: 32 }}>Fatigue Level</div>

      {/* 2. Borg Score Bar */}
      <div style={{ width: "100%", maxWidth: 400, marginBottom: 40 }}>
        <div style={{ position: "relative", height: 10, borderRadius: 999, background: "linear-gradient(to right, #22C55E, #EAB308, #F97316, #EF4444)", marginBottom: 12 }}>
          <div style={{
            position: "absolute", top: -3, left: `calc(${borgPct}% - 8px)`,
            width: 16, height: 16, borderRadius: "50%", background: "var(--text-primary)", border: `2px solid ${conf.color}`
          }} />
        </div>
        <div style={{ textAlign: "center", fontSize: 12, color: "var(--color-text-2)" }}>
          Borg Score: {result.borgScore} / 20
        </div>
      </div>

      {/* 3. Advice Card */}
      <div style={{
        width: "100%", background: `color-mix(in srgb, ${conf.color} 8%, transparent)`,
        border: `1px solid color-mix(in srgb, ${conf.color} 20%, transparent)`,
        borderRadius: 14, padding: 20, marginBottom: 32
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <LevelIcon size={18} color={conf.color} />
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text)" }}>{advice.title}</div>
        </div>
        <div style={{ fontSize: 14, color: "var(--color-text-2)", lineHeight: 1.5, marginBottom: 20 }}>
          {advice.body}
        </div>

        {advice.action && (
          advice.action.disabled ? (
            <button
              title="Recovery is part of training"
              disabled
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                width: "100%", padding: 14, borderRadius: 12, border: "none",
                background: "var(--color-border)", color: "var(--color-text-3)",
                fontSize: 14, fontWeight: 600, cursor: "not-allowed"
              }}
            >
              <ActionIcon size={16} color="#555" /> {advice.action.text}
            </button>
          ) : (
            <Link
              to={advice.action.link}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                width: "100%", padding: 14, borderRadius: 12, border: "none",
                background: conf.color, color: "#000", textDecoration: "none",
                fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "opacity 0.15s"
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = 0.85}
              onMouseLeave={e => e.currentTarget.style.opacity = 1}
            >
              <ActionIcon size={16} color="#000" /> {advice.action.text}
            </Link>
          )
        )}
      </div>

      {/* 4. Retake Button */}
      <button
        onClick={onRetake}
        style={{
          display: "flex", alignItems: "center", gap: 8, background: "none", border: "none",
          color: "var(--color-text-2)", fontSize: 14, cursor: "pointer", transition: "color 0.15s"
        }}
        onMouseEnter={e => e.currentTarget.style.color = "var(--color-text)"}
        onMouseLeave={e => e.currentTarget.style.color = "var(--color-text-2)"}
      >
        <RotateCcw size={14} /> Retake quiz
      </button>
    </div>
  );
}
