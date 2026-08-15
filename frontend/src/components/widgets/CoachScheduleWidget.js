import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Video, Clock, ChevronRight } from "lucide-react";
import { api } from "../../utils/api";

export default function CoachScheduleWidget() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const today = new Date().toISOString().slice(0, 10);
    api.getCoachSchedule(today, today).then((res) => {
      if (!isMounted) return;
      setSessions(Array.isArray(res) ? res : []);
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
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(6, 182, 212, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#06B6D4" }}>
            <Calendar size={15} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)" }}>Today's Coach Schedule</div>
            <div style={{ fontSize: 11, color: "var(--color-text-3)" }}>1-on-1s & Consultations</div>
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
          Calendar <ChevronRight size={12} />
        </button>
      </div>

      {sessions.length === 0 ? (
        <div style={{ padding: "16px", textAlign: "center", color: "var(--color-text-3)", fontSize: 11, background: "rgba(255,255,255,0.02)", borderRadius: 8 }}>
          <Clock size={20} style={{ marginBottom: 4, opacity: 0.3 }} />
          <div>No sessions scheduled for today.</div>
          <div style={{ fontSize: 10, marginTop: 2 }}>You are all caught up!</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {sessions.slice(0, 3).map((s, idx) => (
            <div
              key={s.id || idx}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 10px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
              }}
            >
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text)" }}>
                  {s.title || s.athlete_name || "Consultation"}
                </div>
                <div style={{ fontSize: 10, color: "var(--color-text-3)" }}>
                  {s.start_time || "Scheduled"} • {s.duration_minutes || 45}m
                </div>
              </div>
              <button
                onClick={() => navigate("/coach")}
                style={{
                  background: "rgba(6, 182, 212, 0.15)",
                  border: "1px solid rgba(6, 182, 212, 0.3)",
                  borderRadius: 6,
                  padding: "4px 8px",
                  color: "#06B6D4",
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Video size={11} /> Join
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
