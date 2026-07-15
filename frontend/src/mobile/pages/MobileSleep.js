import React, { useState } from "react";
import { Moon, Save, CheckCircle, AlertTriangle } from "lucide-react";
import { api } from "../../utils/api";
import { API_BASE_URL } from "../../utils/config";
import { getSyncItem } from "../../utils/storage";
import SleepWidget from "../../components/widgets/SleepWidget";

const QUALITY_OPTIONS = [
  { value: 1, emoji: "😫", label: "Terrible", color: "var(--aura-accent3)" },
  { value: 2, emoji: "🥱", label: "Poor", color: "#F59E0B" },
  { value: 3, emoji: "😐", label: "Fair", color: "#FCD34D" },
  { value: 4, emoji: "🙂", label: "Good", color: "var(--aura-cyan)" },
  { value: 5, emoji: "🤩", label: "Excellent", color: "var(--aura-accent)" }
];

export default function MobileSleep() {
  const [hours, setHours] = useState(8);
  const [quality, setQuality] = useState(3); // 1-5
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleLogSleep = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const token = getSyncItem("aura_token");
      const res = await fetch(`${API_BASE_URL}/sleep/log`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          hours: parseFloat(hours),
          quality: quality,
          date: date
        })
      });
      if (!res.ok) throw new Error("Failed to log sleep");
      
      setMessage({ type: 'success', text: "Sleep logged successfully!" });
      setRefreshKey(prev => prev + 1);
    } catch (e) {
      setMessage({ type: 'error', text: e.message || "Failed to log sleep." });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 3500);
    }
  };

  const activeQualityConfig = QUALITY_OPTIONS.find(o => o.value === quality);

  return (
    <div className="mobile-page" style={{ paddingBottom: 120 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px", color: "var(--color-text)" }}>Sleep & Recovery</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: 0 }}>
          Track sleep quality to analyze training and fatigue correlations.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Logger Card */}
        <div className="mobile-card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 20px", display: "flex", alignItems: "center", gap: 8, color: "var(--color-text)" }}>
            <Moon size={18} color="var(--aura-accent)" /> Log Last Night's Sleep
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Date Input */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 8, color: "var(--text-secondary)" }}>DATE</label>
              <input 
                type="date" 
                value={date} 
                onChange={e => setDate(e.target.value)}
                style={{ 
                  width: "100%", background: "var(--color-surface-h)", border: "1px solid var(--color-border)", 
                  borderRadius: 12, padding: "12px", color: "var(--color-text)", fontSize: 15, outline: "none"
                }}
              />
            </div>

            {/* Hours Input */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)" }}>HOURS SLEPT</label>
                <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                  <span style={{ fontSize: 22, fontWeight: 900, color: "var(--aura-cyan)" }}>{hours}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>hrs</span>
                </div>
              </div>
              <input 
                type="range" min="0" max="15" step="0.5"
                value={hours} 
                onChange={e => setHours(parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: "var(--aura-cyan)", height: 6 }} 
              />
            </div>

            {/* Sleep Quality */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)" }}>SLEEP QUALITY</label>
                {activeQualityConfig && (
                  <span style={{ fontSize: 13, fontWeight: 700, color: activeQualityConfig.color }}>
                    {activeQualityConfig.emoji} {activeQualityConfig.label}
                  </span>
                )}
              </div>
              
              <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                {QUALITY_OPTIONS.map(opt => {
                  const isSelected = quality === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setQuality(opt.value)}
                      style={{
                        flex: 1, padding: "12px 0", borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                        background: isSelected ? `color-mix(in srgb, ${opt.color} 20%, transparent)` : "rgba(255,255,255,0.05)",
                        border: `1.5px solid ${isSelected ? opt.color : "transparent"}`,
                        transition: "all 0.2s", cursor: "pointer"
                      }}
                    >
                      <span style={{ fontSize: 22 }}>{opt.emoji}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Success / Error Message banner */}
            {message && (
              <div style={{ 
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

            {/* Submit Button */}
            <button 
              onClick={handleLogSleep}
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
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                cursor: loading ? "not-allowed" : "pointer"
              }}
            >
              {loading ? "Logging..." : <><Save size={18} /> Save Sleep Log</>}
            </button>
          </div>
        </div>

        {/* Correlation Visualization Card */}
        <div className="mobile-card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px", color: "var(--color-text)" }}>
            Sleep vs. Volume Correlation
          </h2>
          <div style={{ height: 200, display: "flex", flexDirection: "column" }}>
            <SleepWidget key={refreshKey} />
          </div>
        </div>
      </div>
    </div>
  );
}
