import React from "react";
import { useNavigate } from "react-router-dom";
import { 
  Activity, Moon, AlertTriangle, Camera, Scale, Heart, ShieldAlert 
} from "lucide-react";
import "../styles/mobile.css";

export default function MobileBodyHub() {
  const navigate = useNavigate();

  return (
    <div className="mobile-page" style={{ paddingBottom: 120 }}>
      {/* ── Header ── */}
      <div style={{ marginBottom: 32, marginTop: 16 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px", margin: 0 }}>
          Body & Recovery
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>
          Track metrics, sleep, and injuries.
        </p>
      </div>

      {/* ── Daily Readiness / Fatigue ── */}
      <div 
        className="mobile-card" 
        style={{ 
          background: "linear-gradient(135deg, rgba(16, 172, 132, 0.2) 0%, rgba(0, 242, 254, 0.1) 100%)", 
          border: "1px solid rgba(16, 172, 132, 0.3)", display: "flex", alignItems: "center", justifyContent: "space-between",
          cursor: "pointer", padding: "20px" 
        }}
        onClick={() => navigate("/fatigue")}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <Heart size={16} color="var(--aura-green)" />
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--aura-green)" }}>Ready to Train</span>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>Fatigue Check</h2>
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 22, background: "var(--aura-green)", display: "flex", alignItems: "center", justifyContent: "center", color: "#000" }}>
          <Activity size={20} strokeWidth={3} />
        </div>
      </div>

      {/* ── 2x2 Grid of Missing Features ── */}
      <div className="mobile-section-header">
        <h2 className="mobile-section-title">Log & Track</h2>
      </div>

      <div className="mobile-grid-2x2" style={{ marginBottom: 32 }}>
        <button className="mobile-quick-action" onClick={() => navigate("/measurements")} style={{ margin: 0, width: '100%' }}>
          <div className="mobile-quick-action-icon" style={{ background: "rgba(0, 242, 254, 0.1)", color: "var(--aura-cyan)" }}>
            <Scale size={18} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span className="mobile-quick-action-label">Body</span>
            <span className="mobile-quick-action-sub">Metrics</span>
          </div>
        </button>

        <button className="mobile-quick-action" onClick={() => navigate("/sleep")} style={{ margin: 0, width: '100%' }}>
          <div className="mobile-quick-action-icon" style={{ background: "rgba(139, 92, 246, 0.1)", color: "var(--aura-purple)" }}>
            <Moon size={18} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span className="mobile-quick-action-label">Sleep</span>
            <span className="mobile-quick-action-sub">Tracker</span>
          </div>
        </button>

        <button className="mobile-quick-action" onClick={() => navigate("/injuries")} style={{ margin: 0, width: '100%' }}>
          <div className="mobile-quick-action-icon" style={{ background: "rgba(255, 0, 127, 0.1)", color: "var(--aura-pink)" }}>
            <ShieldAlert size={18} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span className="mobile-quick-action-label">Injury</span>
            <span className="mobile-quick-action-sub">Log</span>
          </div>
        </button>

        <button className="mobile-quick-action" onClick={() => navigate("/photos")} style={{ margin: 0, width: '100%' }}>
          <div className="mobile-quick-action-icon" style={{ background: "rgba(255, 159, 67, 0.1)", color: "var(--aura-orange)" }}>
            <Camera size={18} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span className="mobile-quick-action-label">Photos</span>
            <span className="mobile-quick-action-sub">Progress</span>
          </div>
        </button>
      </div>

      {/* ── Advanced Analytics (Former Progress) ── */}
      <div className="mobile-section-header">
        <h2 className="mobile-section-title">Analytics</h2>
      </div>

      <div className="mobile-list-item" onClick={() => navigate("/progress")}>
        <div className="mobile-list-icon">
          <Activity size={20} color="var(--aura-cyan)" />
        </div>
        <div className="mobile-list-content">
          <div className="mobile-list-title">Advanced Charts</div>
          <div className="mobile-list-subtitle">Volume, split, and history</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <ChevronRight size={16} color="var(--text-secondary)" />
        </div>
      </div>

    </div>
  );
}

// Inline component since it's just an icon
const ChevronRight = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);
