import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../utils/api";
import { Dumbbell, History, Play, Users, ChevronRight, Trophy, Library } from "lucide-react";
import "../styles/mobile.css";

export default function MobileTrainHub() {
  const navigate = useNavigate();
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getWorkouts(10, 0)
      .then(res => setWorkouts(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mobile-page" style={{ paddingBottom: 120, background: "var(--color-bg)", minHeight: "100vh" }}>
      
      {/* ── Header ── */}
      <div style={{ marginBottom: 32, marginTop: 16 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px", margin: 0 }}>
          Training Hub
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>
          Log sessions, find plans, and track history.
        </p>
      </div>

      {/* ── Primary CTA ── */}
      <div 
        className="mobile-card" 
        style={{ 
          background: "linear-gradient(135deg, var(--aura-accent) 0%, #3b82f6 100%)", 
          border: "none", display: "flex", alignItems: "center", justifyContent: "space-between",
          cursor: "pointer", padding: "24px 20px" 
        }}
        onClick={() => navigate("/workouts/log")}
      >
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", margin: "0 0 4px 0" }}>Start Workout</h2>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>Empty session or from template</span>
        </div>
        <div style={{ width: 48, height: 48, borderRadius: 24, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
          <Play size={24} fill="currentColor" />
        </div>
      </div>

      {/* ── Quick Hub Links (2x2 Grid) ── */}
      <div className="mobile-grid-2x2" style={{ marginBottom: 32 }}>
        <div className="mobile-grid-item" style={{ alignItems: "center", padding: "16px", cursor: "pointer" }} onClick={() => navigate("/coach")}>
          <Users size={24} color="var(--aura-cyan)" style={{ marginBottom: 8 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Coach Zone</span>
        </div>
        <div className="mobile-grid-item" style={{ alignItems: "center", padding: "16px", cursor: "pointer" }} onClick={() => navigate("/workouts/plans")}>
          <Dumbbell size={24} color="var(--aura-purple)" style={{ marginBottom: 8 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>AI Plans</span>
        </div>
        <div className="mobile-grid-item" style={{ alignItems: "center", padding: "16px", cursor: "pointer" }} onClick={() => navigate("/challenges")}>
          <Trophy size={24} color="var(--aura-orange)" style={{ marginBottom: 8 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Challenges</span>
        </div>
        <div className="mobile-grid-item" style={{ alignItems: "center", padding: "16px", cursor: "pointer" }} onClick={() => navigate("/exercises")}>
          <Library size={24} color="var(--aura-pink)" style={{ marginBottom: 8 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Exercises</span>
        </div>
      </div>

      {/* ── Workout History ── */}
      <div className="mobile-section-header">
        <h2 className="mobile-section-title">Recent Workouts</h2>
        <button className="mobile-section-link">View all</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {loading ? (
          <div style={{ color: "var(--text-secondary)", textAlign: "center", padding: 20 }}>Loading...</div>
        ) : workouts.length === 0 ? (
          <div style={{ color: "var(--text-secondary)", textAlign: "center", padding: 20 }}>No workouts logged yet.</div>
        ) : (
          workouts.slice(0, 5).map(w => (
            <div key={w.id} className="mobile-list-item" onClick={() => navigate(`/workouts/${w.id}`)}>
              <div className="mobile-list-icon">
                <History size={20} color="var(--text-secondary)" />
              </div>
              <div className="mobile-list-content">
                <div className="mobile-list-title">{w.name || "Workout"}</div>
                <div className="mobile-list-subtitle">{new Date(w.started_at).toLocaleDateString()}</div>
              </div>
              <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: 8 }}>
                <div>
                  <div className="mobile-list-value">{w.total_volume_kg ? `${w.total_volume_kg}kg` : "—"}</div>
                  <div className="mobile-list-subtitle">{w.duration_minutes ? `${w.duration_minutes}m` : "—"}</div>
                </div>
                <ChevronRight size={16} color="var(--text-secondary)" />
              </div>
            </div>
          ))
        )}
      </div>
      
    </div>
  );
}
