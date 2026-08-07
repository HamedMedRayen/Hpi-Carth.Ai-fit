import React, { useState, useEffect } from "react";
import { api, token } from "../../utils/api";
import { ChevronDown, ChevronRight, Star } from "lucide-react";

const LEVEL_COLORS = {
  beginner: "var(--color-text-3)",
  intermediate: "var(--aura-accent)",
  advanced: "#ff6b6b",
};

function SessionRow({ session, plan, onSelect }) {
  const [expanded, setExpanded] = useState(false);
  const exercisePreview = session.exercises.slice(0, 3).map(ex => ex.name).join(" • ");

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%",
          padding: "10px 12px",
          background: "var(--color-bg-secondary)",
          border: "none",
          borderRadius: 8,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 8,
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(var(--aura-accent-rgb), 0.1)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-bg-secondary)")}
      >
        <div style={{ flex: 1, textAlign: "left" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-2)", marginBottom: 2 }}>
            {session.label}
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-3)" }}>
            {session.exercises.length} exercises
          </div>
          {!expanded && (
            <div style={{ fontSize: 10, color: "var(--color-text-3)", marginTop: 4 }}>
              {exercisePreview}
            </div>
          )}
        </div>
        <div style={{ fontSize: 14 }}>{expanded ? <ChevronDown size={18} strokeWidth={1.8} /> : <ChevronRight size={18} strokeWidth={1.8} />}</div>
      </button>

      {expanded && (
        <div
          style={{
            maxHeight: "200px",
            overflow: "auto",
            marginBottom: 12,
            paddingLeft: 12,
            borderLeft: "2px solid var(--aura-accent)",
            animation: "slideDown 0.2s ease",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {session.exercises.map((ex, idx) => (
              <div key={idx} style={{ fontSize: 11, color: "var(--color-text-2)" }}>
                • {ex.name} — {ex.sets}×{ex.reps}
              </div>
            ))}
          </div>
          <button
            onClick={() => onSelect(plan, session)}
            style={{
              width: "100%",
              marginTop: 12,
              padding: "8px 12px",
              borderRadius: 8,
              border: "none",
              background: "var(--aura-accent)",
              color: "var(--color-on-accent)",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            Load Session
          </button>
        </div>
      )}
    </div>
  );
}

function PlanCard({ plan, lastPlanId, onSelect }) {
  const [expanded, setExpanded] = useState(false);
  const isLastPlan = plan.id === lastPlanId;

  return (
    <div
      style={{
        borderRadius: 10,
        border: "1px solid var(--color-border)",
        background: "var(--color-bg-secondary)",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%",
          padding: "12px 14px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ flex: 1, textAlign: "left" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>
              {plan.name}
            </div>
            {isLastPlan && (
              <div
                style={{
                  fontSize: 12,
                  padding: "2px 8px",
                  borderRadius: 12,
                  background: "rgba(251,191,36,0.2)",
                  color: "#fbbf24",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 4
                }}
              >
                <Star size={12} strokeWidth={1.8} fill="currentColor" /> Last
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "var(--color-text-3)" }}>
              {plan.days_per_week} days/week
            </span>
            <span style={{ fontSize: 11, color: "var(--color-text-3)" }}>
              {plan.duration_weeks} weeks
            </span>
            <span style={{ fontSize: 11, color: LEVEL_COLORS[plan.level] }}>
              {plan.level}
            </span>
          </div>
        </div>
        <div style={{ fontSize: 14 }}>{expanded ? <ChevronDown size={18} strokeWidth={1.8} /> : <ChevronRight size={18} strokeWidth={1.8} />}</div>
      </button>

      {expanded && (
        <div
          style={{
            padding: "12px 14px",
            borderTop: "1px solid var(--color-border)",
            animation: "slideDown 0.2s ease",
          }}
        >
          <div style={{ fontSize: 12, color: "var(--color-text-2)", marginBottom: 12 }}>
            {plan.description}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {plan.sessions.map((session, idx) => (
              <SessionRow
                key={idx}
                session={session}
                plan={plan}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PlanPickerModal({ open, onClose, onSelect }) {
  const [plans, setPlans] = useState([]);
  const [lastPlan, setLastPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [grouped, setGrouped] = useState({});
  const [customPlans, setCustomPlans] = useState([]);

  useEffect(() => {
    if (!open) return;

    const loadPlans = async () => {
      setLoading(true);
      try {
        const userId = token.userId() || "1";

        // Fetch all plans
        const allPlans = await api.getPlans();
        setPlans(allPlans);

        // Fetch user's last recommended plan
        try {
          const history = await api.getRecommendationHistory(userId);
          setLastPlan(history);
        } catch (e) {
          setLastPlan(null);
        }

        // Group by level
        const g = { beginner: [], intermediate: [], advanced: [] };
        const custom = [];
        allPlans.forEach(plan => {
          if (plan.is_custom) {
            custom.push(plan);
          } else if (g[plan.level]) {
            g[plan.level].push(plan);
          }
        });
        setGrouped(g);
        setCustomPlans(custom);
      } catch (e) {
        console.error("Failed to load plans:", e);
      } finally {
        setLoading(false);
      }
    };

    loadPlans();
  }, [open]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 5000,
        animation: "fadeIn 0.2s ease",
      }}
      onClick={onClose}
    >
      <div
        style={{
          maxWidth: 480,
          maxHeight: "80vh",
          background: "var(--color-bg)",
          borderRadius: 20,
          padding: 24,
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          animation: "popIn 0.2s ease",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text)" }}>
            Choose a Plan
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "none",
              background: "var(--color-bg-secondary)",
              color: "var(--color-text-3)",
              cursor: "pointer",
              fontSize: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 14, color: "var(--color-text-3)" }}>Loading plans...</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* User's custom saved plans */}
            {customPlans.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--aura-accent)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "1px" }}>
                  Your Saved Programs
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {customPlans.map((plan) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      lastPlanId={lastPlan?.id}
                      onSelect={onSelect}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Plans grouped by level */}
            {["beginner", "intermediate", "advanced"].map((level) => (
              grouped[level]?.length > 0 && (
                <div key={level}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: LEVEL_COLORS[level],
                      marginBottom: 8,
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                    }}
                  >
                    {level === "beginner" ? "Beginner" : level === "intermediate" ? "Intermediate" : "Advanced"}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {grouped[level].map((plan) => (
                      <PlanCard
                        key={plan.id}
                        plan={plan}
                        lastPlanId={lastPlan?.id}
                        onSelect={onSelect}
                      />
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes popIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes slideDown {
          from {
            max-height: 0;
            opacity: 0;
          }
          to {
            max-height: 200px;
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
