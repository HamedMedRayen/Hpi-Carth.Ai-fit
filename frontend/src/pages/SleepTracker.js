import React, { useState, useEffect } from "react";
import SleepWidget from "../components/widgets/SleepWidget";
import { api } from "../utils/api";
import { Moon, Save, CheckCircle, AlertTriangle } from "lucide-react";
import { API_BASE_URL } from "../utils/config";
import { getSyncItem } from "../utils/storage";

const API = API_BASE_URL;

export default function SleepTracker() {
  const [hours, setHours] = useState(8);
  const [quality, setQuality] = useState(3); // 1-5
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleLogSleep = async () => {
    setLoading(true);
    try {
      const token = getSyncItem("aura_token");
      const res = await fetch(`${API}/sleep/log`, {
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
      if (!res.ok) throw new Error("Failed");
      
      setMessage({ type: 'success', text: "Sleep logged successfully!" });
      setRefreshKey(prev => prev + 1);
    } catch (e) {
      setMessage({ type: 'error', text: "Failed to log sleep." });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const getQualityText = (q) => {
    switch(q) {
      case 1: return "Terrible";
      case 2: return "Poor";
      case 3: return "Fair";
      case 4: return "Good";
      case 5: return "Excellent";
      default: return "";
    }
  };

  return (
    <div style={{ padding: "32px 24px 100px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 className="font-display" style={{ fontSize: 28, fontWeight: 800, color: "var(--color-text)", marginBottom: 8 }}>Sleep & Recovery</h1>
        <p style={{ color: "var(--color-text-2)" }}>Track your sleep quality to see how it correlates with your training volume and recovery.</p>
      </div>

      <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
        {/* Left: Logger */}
        <div className="glass card" style={{ padding: 24, flex: "1 1 350px" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <Moon size={20} color="var(--aura-accent)" /> Log Last Night's Sleep
          </h2>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Date</label>
              <input 
                type="date" 
                className="themed-input"
                value={date} 
                onChange={e => setDate(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Hours Slept: <span style={{ color: "var(--aura-accent)", fontWeight: 800 }}>{hours}h</span></label>
              <input 
                type="range" min="0" max="15" step="0.5"
                value={hours} 
                onChange={e => setHours(e.target.value)}
                style={{ width: "100%", accentColor: "var(--aura-accent)" }} 
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Sleep Quality</label>
              <div style={{ display: "flex", gap: 8 }}>
                {[1, 2, 3, 4, 5].map(q => (
                  <button
                    key={q}
                    onClick={() => setQuality(q)}
                    style={{
                      flex: 1,
                      padding: "10px 4px",
                      borderRadius: 8,
                      border: "1px solid var(--color-border)",
                      background: quality === q ? "var(--aura-accent)" : "transparent",
                      color: quality === q ? "#000" : "var(--color-text)",
                      fontWeight: 600,
                      fontSize: 12,
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                  >
                    {getQualityText(q)}
                  </button>
                ))}
              </div>
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

            <button 
              onClick={handleLogSleep}
              disabled={loading}
              style={{
                width: "100%",
                background: "var(--aura-accent)",
                color: "#000",
                border: "none",
                borderRadius: 12,
                padding: "14px",
                fontWeight: 700,
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

        {/* Right: Visualization */}
        <div className="glass card" style={{ padding: 24, flex: "2 1 400px", minHeight: 400 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Sleep vs. Volume Correlation</h2>
          <div style={{ height: 350 }}>
            <SleepWidget key={refreshKey} />
          </div>
        </div>
      </div>
    </div>
  );
}
