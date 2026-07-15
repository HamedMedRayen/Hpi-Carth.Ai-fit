import React, { useState, useEffect } from "react";
import BodySilhouette from "../components/BodySilhouette";
import { api } from "../utils/api";
import { AlertTriangle, CheckCircle, Trash2 } from "lucide-react";

export default function InjuryLog() {
  const [selectedPart, setSelectedPart] = useState(null); // { key, label }
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
      const res = await api.getInjuries() || [];
      setInjuries(res);
    } catch (e) { console.error(e); }
  };

  const handleLogInjury = async () => {
    if (!selectedPart) return;
    setLoading(true);
    try {
      await api.logInjury({
        body_part: selectedPart.key,
        severity,
        description,
        start_date: new Date().toISOString().split('T')[0]
      });
      setMessage({ type: 'success', text: `Injury logged for ${selectedPart.label}` });
      setSelectedPart(null);
      setDescription("");
      setSeverity(5);
      fetchInjuries();
    } catch (e) {
      setMessage({ type: 'error', text: "Failed to log injury." });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleHealed = async (id) => {
    try {
      await api.markInjuryHealed(id);
      await fetchInjuries(); // Wait for fresh data
    } catch (e) {
      console.error("Failed to mark as healed", e);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this log?")) return;
    try {
      await api.deleteInjury(id);
      await fetchInjuries();
    } catch (e) {
      console.error("Failed to delete injury", e);
    }
  };

  return (
    <div className="injury-log-container" style={{ padding: "32px 24px 100px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 className="font-display" style={{ fontSize: 28, fontWeight: 800, color: "var(--color-text)", marginBottom: 8 }}>Injury & Recovery Log</h1>
        <p style={{ color: "var(--color-text-2)" }}>Track your physical well-being. Select a zone on the map to log pain or view your history below.</p>
      </div>

      <div style={{ display: "flex", gap: 32, flexWrap: "wrap", marginBottom: 40 }}>
        {/* Left: Silhouette */}
        <div className="glass card" style={{ padding: 24, flex: "1 1 300px", textAlign: "center" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Body Map</h2>
          <BodySilhouette injuries={injuries} onZoneClick={(key, label) => setSelectedPart({ key, label })} />
          <p style={{ fontSize: 12, color: "var(--color-text-3)", marginTop: 16 }}>
            Red/Orange zones indicate active issues.
          </p>
        </div>

        {/* Right: Logging Form */}
        <div className="glass card" style={{ padding: 24, flex: "2 1 400px" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>
            {selectedPart ? `Log Issue: ${selectedPart.label}` : "Select a body part to begin"}
          </h2>

          {selectedPart ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Severity (1-10)</label>
                <input 
                  type="range" min="1" max="10" 
                  value={severity} 
                  onChange={e => setSeverity(parseInt(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--aura-accent)" }} 
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--color-text-3)", marginTop: 4 }}>
                  <span>Discomfort (1)</span>
                  <span style={{ fontWeight: 700, color: severity > 7 ? "var(--aura-accent3)" : "var(--aura-accent)" }}>{severity}</span>
                  <span>Severe Pain (10)</span>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Description / Notes</label>
                <textarea 
                  className="themed-input"
                  placeholder="What happened? Any specific movements that hurt?"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  style={{ width: "100%", minHeight: 100, resize: "vertical" }}
                />
              </div>

              {message && (
                <div style={{ 
                  padding: "12px 16px", 
                  borderRadius: 8, 
                  background: message.type === 'success' ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                  color: message.type === 'success' ? "#22C55E" : "#EF4444",
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 8
                }}>
                  {message.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                  {message.text}
                </div>
              )}

              <div style={{ display: "flex", gap: 12 }}>
                <button 
                  onClick={handleLogInjury}
                  disabled={loading}
                  style={{
                    flex: 2,
                    background: "var(--aura-accent)",
                    color: "#000",
                    border: "none",
                    borderRadius: 12,
                    padding: "14px",
                    fontWeight: 700,
                    cursor: loading ? "not-allowed" : "pointer"
                  }}
                >
                  {loading ? "Logging..." : "Save Injury Log"}
                </button>
                <button 
                  onClick={() => setSelectedPart(null)}
                  style={{
                    flex: 1,
                    background: "transparent",
                    color: "var(--color-text-2)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    padding: "14px",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--color-text-3)" }}>
              <AlertTriangle size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
              <p>Nothing selected yet.</p>
              <p style={{ fontSize: 13 }}>Use the body map on the left to indicate where you're feeling pain or discomfort.</p>
            </div>
          )}

          {/* History Dashboard moved inside the right column */}
          <div style={{ marginTop: 40, borderTop: "1px solid var(--color-border)", paddingTop: 32 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>History Log</h2>
            
            {injuries.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--color-text-3)' }}>No history yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {injuries.map(injury => {
                  const isActive = injury.status?.toLowerCase().trim() === 'active';
                  return (
                    <div key={injury.id} className="glass injury-card" style={{ padding: 16, borderRadius: 12, borderLeft: `4px solid ${isActive ? 'var(--aura-accent3)' : '#22C55E'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div>
                          <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: 'capitalize' }}>{injury.body_part.replace('_', ' ')}</h3>
                          <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{injury.start_date}</span>
                        </div>
                        <div style={{ 
                          padding: '2px 6px', 
                          borderRadius: 4, 
                          fontSize: 10, 
                          fontWeight: 800,
                          background: isActive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                          color: isActive ? '#EF4444' : '#22C55E'
                        }}>
                          {isActive ? 'ACTIVE' : 'HEALED'}
                        </div>
                      </div>

                      <p style={{ fontSize: 12, color: 'var(--color-text-2)', marginBottom: 12 }}>
                        {injury.description || "No notes."}
                      </p>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ height: 3, width: 40, background: 'var(--color-border)', borderRadius: 2 }}>
                            <div className="injury-element" style={{ height: '100%', width: `${injury.severity * 10}%`, background: injury.severity > 7 ? 'var(--aura-accent3)' : 'var(--aura-accent)', borderRadius: 2 }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600 }}>S{injury.severity}</span>
                        </div>
                        
                        <div style={{ display: 'flex', gap: 8 }}>
                          {isActive && (
                            <button 
                              onClick={() => handleHealed(injury.id)}
                              style={{
                                padding: "6px 12px",
                                background: "#22C55E",
                                color: "#000",
                                border: "none",
                                borderRadius: 8,
                                fontSize: 11,
                                fontWeight: 800,
                                cursor: "pointer"
                              }}
                            >
                              MARK HEALED
                            </button>
                          )}
                          <button 
                            onClick={() => handleDelete(injury.id)}
                            style={{
                              padding: "6px",
                              background: "transparent",
                              color: "var(--color-text-3)",
                              border: "none",
                              cursor: "pointer",
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Delete Log"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
