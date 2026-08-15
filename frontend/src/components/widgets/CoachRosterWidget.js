import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, AlertCircle, Heart, ChevronRight, UserCheck, MessageSquare } from "lucide-react";
import { api } from "../../utils/api";

export default function CoachRosterWidget() {
  const navigate = useNavigate();
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    api.getMyAthletes().then((res) => {
      if (!isMounted) return;
      setAthletes(Array.isArray(res) ? res : []);
      setLoading(false);
    }).catch(() => {
      if (isMounted) setLoading(false);
    });
    return () => { isMounted = false; };
  }, []);

  const totalCount = athletes.length;
  const highFatigueCount = athletes.filter((a) => (a.fatigue_score || 0) >= 7).length;
  const injuredCount = athletes.filter((a) => (a.active_injuries || 0) > 0).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(139, 92, 246, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--aura-accent, #8b5cf6)" }}>
            <Users size={15} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)" }}>Coach Athlete Roster</div>
            <div style={{ fontSize: 11, color: "var(--color-text-3)" }}>Active Client Monitoring</div>
          </div>
        </div>
        <button
          onClick={() => navigate("/coach")}
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
          Workspace <ChevronRight size={12} />
        </button>
      </div>

      {/* Stats Counters */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--color-border)", borderRadius: 8, padding: "8px", textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: "var(--color-text)" }}>{totalCount}</div>
          <div style={{ fontSize: 9, color: "var(--color-text-3)", textTransform: "uppercase" }}>Athletes</div>
        </div>
        <div style={{ background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: 8, padding: "8px", textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: "#EF4444" }}>{injuredCount}</div>
          <div style={{ fontSize: 9, color: "#EF4444", textTransform: "uppercase" }}>Injured</div>
        </div>
        <div style={{ background: "rgba(245, 158, 11, 0.05)", border: "1px solid rgba(245, 158, 11, 0.2)", borderRadius: 8, padding: "8px", textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: "#F59E0B" }}>{highFatigueCount}</div>
          <div style={{ fontSize: 9, color: "#F59E0B", textTransform: "uppercase" }}>High Fatigue</div>
        </div>
      </div>

      {/* Roster quick list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 110, overflowY: "auto" }}>
        {athletes.slice(0, 3).map((ath, idx) => (
          <div
            key={ath.id || idx}
            onClick={() => navigate("/coach")}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "6px 8px",
              background: "rgba(255,255,255,0.02)",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(139, 92, 246, 0.3)", color: "var(--aura-accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800 }}>
                {(ath.name || "A").charAt(0)}
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text)" }}>{ath.name || `Athlete #${ath.id}`}</span>
            </div>
            <span style={{ fontSize: 10, color: "var(--color-text-3)" }}>
              {ath.goal ? ath.goal.replace("_", " ") : "Active"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
