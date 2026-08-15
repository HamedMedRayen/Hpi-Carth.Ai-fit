import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Brain, AlertTriangle, ArrowRight, ShieldCheck } from "lucide-react";
import { api } from "../../utils/api";

export default function CoachAnomalyWidget() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    api.getMyAthletes().then((athletes) => {
      if (!isMounted) return;
      const detected = [];
      if (Array.isArray(athletes)) {
        athletes.forEach((ath) => {
          if ((ath.fatigue_score || 0) >= 8) {
            detected.push({
              athlete: ath.name || `Athlete #${ath.id}`,
              athleteId: ath.id,
              type: "Fatigue Spike",
              message: `Reported severe fatigue (${ath.fatigue_score}/10). Deload recommended.`,
              severity: "high",
            });
          }
          if ((ath.active_injuries || 0) > 0) {
            detected.push({
              athlete: ath.name || `Athlete #${ath.id}`,
              athleteId: ath.id,
              type: "Injury Flag",
              message: `${ath.active_injuries} active injury logged. Review workout plan.`,
              severity: "warning",
            });
          }
        });
      }
      setAlerts(detected);
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
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(236, 72, 153, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#EC4899" }}>
            <Brain size={15} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)" }}>AI Athlete Anomaly Detector</div>
            <div style={{ fontSize: 11, color: "var(--color-text-3)" }}>Automated Risk Detection</div>
          </div>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div style={{ padding: "16px", textAlign: "center", color: "var(--color-text-3)", fontSize: 11, background: "rgba(255,255,255,0.02)", borderRadius: 8 }}>
          <ShieldCheck size={20} color="#10B981" style={{ marginBottom: 4 }} />
          <div style={{ color: "#10B981", fontWeight: 700 }}>All athletes on track!</div>
          <div style={{ fontSize: 10, marginTop: 2 }}>No fatigue spikes or injury anomalies flagged.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {alerts.slice(0, 3).map((al, idx) => (
            <div
              key={idx}
              onClick={() => navigate("/coach")}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 10px",
                background: al.severity === "high" ? "rgba(239, 68, 68, 0.06)" : "rgba(245, 158, 11, 0.06)",
                border: `1px solid ${al.severity === "high" ? "rgba(239, 68, 68, 0.25)" : "rgba(245, 158, 11, 0.25)"}`,
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: al.severity === "high" ? "#EF4444" : "#F59E0B" }}>
                  {al.athlete} • {al.type}
                </div>
                <div style={{ fontSize: 10, color: "var(--color-text-2)", marginTop: 1 }}>{al.message}</div>
              </div>
              <ArrowRight size={13} style={{ opacity: 0.5 }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
