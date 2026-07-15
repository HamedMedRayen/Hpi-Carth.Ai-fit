import React, { useState, useEffect } from "react";
import BodySilhouette from "../../components/BodySilhouette";
import { api } from "../../utils/api";
import MobileBottomSheet from "../components/MobileBottomSheet";
import { AlertTriangle, CheckCircle, Trash2, Calendar, ShieldAlert } from "lucide-react";

export default function MobileInjuryLog() {
  const [selectedPart, setSelectedPart] = useState(null);
  const [severity, setSeverity] = useState(5);
  const [description, setDescription] = useState("");
  const [injuries, setInjuries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchInjuries();
  }, []);

  const fetchInjuries = async () => {
    try {
      const res = await api.getInjuries();
      setInjuries(res || []);
    } catch (e) {
      console.error("Failed to load injuries", e);
    }
  };

  const handleLogInjury = async () => {
    if (!selectedPart) return;
    setLoading(true);
    setMessage(null);
    try {
      await api.logInjury({
        body_part: selectedPart.key,
        severity,
        description,
        start_date: new Date().toISOString().split('T')[0]
      });
      setMessage({ type: 'success', text: `Injury logged for ${selectedPart.label}!` });
      setSelectedPart(null);
      setDescription("");
      setSeverity(5);
      fetchInjuries();
    } catch (e) {
      setMessage({ type: 'error', text: "Failed to log injury." });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 3500);
    }
  };

  const handleHealed = async (id) => {
    try {
      await api.markInjuryHealed(id);
      fetchInjuries();
    } catch (e) {
      console.error("Failed to mark healed", e);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this log?")) return;
    try {
      await api.deleteInjury(id);
      fetchInjuries();
    } catch (e) {
      console.error("Failed to delete injury", e);
    }
  };

  return (
    <div className="mobile-page" style={{ paddingBottom: 120 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px", color: "var(--color-text)" }}>Injury Map & Logs</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: 0 }}>
          Tap a body zone to record pain or review your recovery logs below.
        </p>
      </div>

      {/* Body Map silhouette card */}
      <div className="mobile-card" style={{ padding: 16, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px", alignSelf: "flex-start", color: "var(--color-text)" }}>Body Map</h2>
        <div style={{ width: "100%", overflow: "hidden", display: "flex", justifyContent: "center" }}>
          <BodySilhouette injuries={injuries} onZoneClick={(key, label) => setSelectedPart({ key, label })} />
        </div>
        <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 12, marginBottom: 0 }}>
          Red/orange zones show active pain reports.
        </p>
      </div>

      {/* Inline message banners */}
      {message && (
        <div style={{ 
          marginTop: 16,
          padding: "12px 16px", 
          borderRadius: 12, 
          background: message.type === 'success' ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
          border: `1px solid ${message.type === 'success' ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
          color: message.type === 'success' ? "#22C55E" : "#EF4444",
          fontSize: 13,
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontWeight: 600
        }}>
          {message.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          {message.text}
        </div>
      )}

      {/* History Log Section */}
      <div style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--color-text)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <ShieldAlert size={18} color="var(--aura-accent3)" /> History Log
        </h2>

        {injuries.length === 0 ? (
          <div style={{ padding: "32px 16px", textAlign: "center", background: "var(--color-surface)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 16 }}>
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 13 }}>No active or past injuries logged.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {injuries.map(injury => {
              const isActive = injury.status?.toLowerCase().trim() === 'active';
              return (
                <div 
                  key={injury.id} 
                  className="mobile-card" 
                  style={{ 
                    padding: 16, 
                    borderLeft: `4px solid ${isActive ? 'var(--aura-accent3)' : '#22C55E'}` 
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 800, textTransform: 'capitalize', margin: "0 0 2px", color: "var(--color-text)" }}>
                        {injury.body_part.replace('_', ' ')}
                      </h3>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-secondary)", fontSize: 11 }}>
                        <Calendar size={12} /> {injury.start_date}
                      </div>
                    </div>
                    <div style={{ 
                      padding: '2px 8px', 
                      borderRadius: 6, 
                      fontSize: 10, 
                      fontWeight: 800,
                      background: isActive ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                      color: isActive ? '#EF4444' : '#22C55E',
                      border: `1px solid ${isActive ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)'}`
                    }}>
                      {isActive ? 'ACTIVE' : 'HEALED'}
                    </div>
                  </div>

                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: "0 0 16px", lineHeight: 1.4 }}>
                    {injury.description || "No description provided."}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {/* Severity display */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ height: 4, width: 60, background: "var(--color-border)", borderRadius: 2 }}>
                        <div style={{ height: '100%', width: `${injury.severity * 10}%`, background: injury.severity > 7 ? 'var(--aura-accent3)' : 'var(--aura-accent)', borderRadius: 2 }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text)" }}>Sev: {injury.severity}/10</span>
                    </div>
                    
                    {/* Action buttons */}
                    <div style={{ display: 'flex', alignItems: "center", gap: 10 }}>
                      {isActive && (
                        <button 
                          onClick={() => handleHealed(injury.id)}
                          style={{
                            padding: "6px 12px",
                            background: "#22C55E",
                            color: "var(--color-bg)",
                            border: "none",
                            borderRadius: 8,
                            fontSize: 11,
                            fontWeight: 800,
                            cursor: "pointer"
                          }}
                        >
                          HEALED
                        </button>
                      )}
                      <button 
                        onClick={() => handleDelete(injury.id)}
                        style={{
                          background: "transparent",
                          color: "var(--text-secondary)",
                          border: "none",
                          cursor: "pointer",
                          padding: "6px",
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Delete Log"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Injury logging sheet */}
      <MobileBottomSheet
        isOpen={!!selectedPart}
        onClose={() => setSelectedPart(null)}
        title={selectedPart ? `Log Issue: ${selectedPart.label}` : ""}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 8, color: "var(--text-secondary)" }}>PAIN SEVERITY</label>
            <input 
              type="range" min="1" max="10" 
              value={severity} 
              onChange={e => setSeverity(parseInt(e.target.value))}
              style={{ width: "100%", accentColor: "var(--aura-accent3)" }} 
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
              <span>Discomfort (1)</span>
              <span style={{ fontWeight: 700, color: severity > 7 ? "var(--aura-accent3)" : "var(--aura-accent)" }}>{severity} / 10</span>
              <span>Severe Pain (10)</span>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 8, color: "var(--text-secondary)" }}>DESCRIPTION / NOTES</label>
            <textarea 
              placeholder="What happened? Any specific movements that trigger pain?"
              value={description}
              onChange={e => setDescription(e.target.value)}
              style={{ 
                width: "100%", minHeight: 90, resize: "none", outline: "none",
                background: "var(--color-surface-h)", border: "1px solid var(--color-border)", 
                borderRadius: 12, padding: 12, color: "var(--color-text)", fontSize: 14
              }}
            />
          </div>

          <button 
            onClick={handleLogInjury}
            disabled={loading}
            style={{
              width: "100%",
              background: "var(--aura-accent)",
              color: "var(--color-bg)",
              border: "none",
              borderRadius: 12,
              padding: "16px",
              fontWeight: 800,
              fontSize: 15,
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Saving Log..." : "Save Injury Log"}
          </button>
        </div>
      </MobileBottomSheet>
    </div>
  );
}
