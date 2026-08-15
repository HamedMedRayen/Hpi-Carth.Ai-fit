import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Award, Trophy, TrendingUp, Sparkles, ChevronRight } from "lucide-react";
import { api } from "../../utils/api";

export default function PrTrophyWidget() {
  const navigate = useNavigate();
  const [prs, setPrs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    api.getPRs().then((res) => {
      if (!isMounted) return;
      setPrs(Array.isArray(res) ? res.slice(0, 4) : []);
      setLoading(false);
    }).catch(() => {
      if (isMounted) setLoading(false);
    });
    return () => { isMounted = false; };
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(234, 179, 8, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#EAB308" }}>
            <Trophy size={15} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)" }}>PR Trophy Shelf</div>
            <div style={{ fontSize: 11, color: "var(--color-text-3)" }}>Estimated 1RM Best Records</div>
          </div>
        </div>
        <button
          onClick={() => navigate("/progress")}
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
          All PRs <ChevronRight size={12} />
        </button>
      </div>

      {prs.length === 0 ? (
        <div style={{ padding: "20px", textAlign: "center", color: "var(--color-text-3)", fontSize: 12, background: "rgba(255,255,255,0.02)", borderRadius: 10 }}>
          <Award size={24} style={{ marginBottom: 6, opacity: 0.3 }} />
          <div>No personal records recorded yet.</div>
          <div style={{ fontSize: 10, marginTop: 2 }}>Log workouts to unlock PR trophies!</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {prs.map((p, idx) => (
            <div
              key={idx}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--color-border)",
                borderRadius: 10,
                padding: "8px 10px",
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {p.exercise_name || p.exercise || "Lift"}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontSize: 16, fontWeight: 900, color: "var(--aura-accent, #8b5cf6)" }}>
                  {Math.round(p.one_rm_est || p.one_rm || p.weight_kg || 0)}kg
                </span>
                <span style={{ fontSize: 9, color: "var(--color-text-3)" }}>est. 1RM</span>
              </div>
              <div style={{ fontSize: 9, color: "var(--color-text-3)", display: "flex", justifyContent: "space-between" }}>
                <span>{p.weight_kg}kg × {p.reps} reps</span>
                {p.achieved_date && <span>{p.achieved_date.slice(5, 10)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
