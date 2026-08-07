import React, { useState, useEffect, useCallback } from "react";
import { Ruler, History, Trash2 } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, ResponsiveContainer,
} from "recharts";
import { useChartColors } from "../hooks/useChartColors";
import { useTheme } from "../utils/theme";
import BodySilhouette from "../components/cards/BodySilhouette";
import { API_BASE_URL } from "../utils/config";
import { getSyncItem } from "../utils/storage";

const API = API_BASE_URL;

/** Format a yyyy-mm-dd string → "Apr 25" */
function fmtDate(dateStr) {
  if (!dateStr) return "";
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

/** Format a yyyy-mm-dd string → "Apr 25, 2026" */
function fmtDateLong(dateStr) {
  if (!dateStr) return "";
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

const MEASUREMENT_FIELDS = [
  { key: "neck",        label: "Neck" },
  { key: "shoulders",   label: "Shoulders" },
  { key: "chest",       label: "Chest" },
  { key: "waist",       label: "Waist" },
  { key: "hips",        label: "Hips" },
  { key: "left_arm",    label: "Left Arm" },
  { key: "right_arm",   label: "Right Arm" },
  { key: "left_thigh",  label: "Left Thigh" },
  { key: "right_thigh", label: "Right Thigh" },
  { key: "left_calf",   label: "Left Calf" },
  { key: "right_calf",  label: "Right Calf" },
];

const TABS = [
  { id: "waist",   label: "Waist",  keys: ["waist"] },
  { id: "chest",   label: "Chest",  keys: ["chest"] },
  { id: "hips",    label: "Hips",   keys: ["hips"] },
  { id: "arms",    label: "Arms",   keys: ["left_arm", "right_arm"] },
  { id: "thighs",  label: "Thighs", keys: ["left_thigh", "right_thigh"] },
];

const LEGEND_ITEMS = [
  { color: "#22C55E", label: "Decreased" },
  { color: "#00BCD4", label: "No change" },
  { color: "#EF4444", label: "Increased" },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function Measurements() {
  const { theme } = useTheme();
  const colors = useChartColors();

  const [history, setHistory]   = useState([]);
  const [latest, setLatest]     = useState(null);
  const [previous, setPrevious] = useState(null);
  const [activeTab, setActiveTab] = useState("waist");

  // Form state
  const [formDate, setFormDate] = useState(todayStr());
  const [formValues, setFormValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);

  // ── Fetch ─────────────────────────────────────────────────────
  function fetchHistory() {
    const tok = getSyncItem("aura_token");
    const h = { Authorization: `Bearer ${tok}` };
    fetch(`${API}/measurements/history`, { headers: h })
      .then((r) => r.json())
      .then((data) => {
        const arr = Array.isArray(data) ? data : [];
        setHistory(arr);
        setLatest(arr[0] || null);
        setPrevious(arr[1] || null);
      })
      .catch(() => {});
  }

  async function handleDelete(id) {
    const tok = getSyncItem("aura_token");
    try {
      const res = await fetch(`${API}/measurements/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (!res.ok) return;
      // Update local state without a round-trip
      setHistory(prev => {
        const next = prev.filter(r => r.id !== id);
        setLatest(next[0] || null);
        setPrevious(next[1] || null);
        return next;
      });
    } catch {}
  }

  const [injuries, setInjuries] = useState([]);

  useEffect(() => { 
    fetchHistory();
    fetchInjuries();
  }, []);

  function fetchInjuries() {
    const tok = getSyncItem("aura_token");
    fetch(`${API}/injuries`, { headers: { Authorization: `Bearer ${tok}` } })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Only show active injuries (end_date is null)
          setInjuries(data.filter(i => !i.end_date));
        }
      })
      .catch(() => {});
  }

  // ── Submit form ───────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    try {
      const token = getSyncItem("aura_token");
      const body = { date: formDate };
      MEASUREMENT_FIELDS.forEach(({ key }) => {
        const v = formValues[key];
        body[key] = v !== "" && v !== undefined ? parseFloat(v) : null;
      });
      const res = await fetch(`${API}/measurements/log`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      setSaveMsg("Saved!");
      setFormValues({});
      fetchHistory();
    } catch {
      setSaveMsg("Error saving. Try again.");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 3000);
    }
  }

  // ── Chart data ────────────────────────────────────────────────
  const tab = TABS.find((t) => t.id === activeTab);
  const chartData = [...history]
    .reverse()
    .map((row) => {
      const entry = { date: row.date };
      tab.keys.forEach((k) => { entry[k] = row[k] ?? null; });
      return entry;
    })
    .filter((row) => tab.keys.some((k) => row[k] !== null));

  const hasChartData = chartData.length > 0;

  // ── Custom tooltip ────────────────────────────────────────────
  function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: colors.tooltipBg,
        border: `1px solid ${colors.tooltipBorder}`,
        borderRadius: 10,
        padding: "10px 14px",
        fontSize: 13,
        color: colors.text,
      }}>
        <div style={{ marginBottom: 4, fontWeight: 600 }}>
          {label ? fmtDateLong(label) : label}
        </div>
        {payload.map((p) => (
          <div key={p.dataKey} style={{ color: p.stroke }}>
            {p.name}: {p.value} cm
          </div>
        ))}
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", paddingBottom: 60 }}>
      {/* Page header */}
      <div style={{
        background: "var(--color-bg2)",
        borderBottom: "0.5px solid var(--color-border)",
        padding: "16px 20px",
      }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "var(--color-text)", display: "flex", alignItems: "center", gap: 8 }}>
          <Ruler size={22} color="var(--aura-accent)" /> Body Measurements
        </h1>
        <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--color-text-3)" }}>
          Track your body measurements over time
        </p>
      </div>

      <div className="page-inner" style={{ maxWidth: 1100 }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "minmax(200px, 280px) 1fr",
          gap: 24,
          alignItems: "start",
        }}
          className="measurements-grid"
        >
          {/* ── LEFT: Silhouette ─────────────────────────────── */}
          <div>
            <div className="card" style={{ padding: 20, marginBottom: 16 }}>
              <BodySilhouette latest={latest} previous={previous} injuries={injuries} />

              {/* Legend */}
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 6 }}>
                {LEGEND_ITEMS.map(({ color, label }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</span>
                  </div>
                ))}
              </div>

              {/* Last logged */}
              {latest?.date && (
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 12, marginBottom: 0 }}>
                  Last logged: {fmtDateLong(latest.date)}
                </p>
              )}
            </div>
          </div>

          {/* ── RIGHT: Form + History ────────────────────────── */}
          <div>
            {/* Log form */}
            <form className="card" style={{ padding: 20 }} onSubmit={handleSubmit}>
              <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                <Ruler size={16} color="var(--aura-accent)" /> Log Measurements
              </h2>

              {/* Date */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                  Date
                </label>
                <input
                  type="date"
                  className="themed-input"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  required
                />
              </div>

              {/* Measurements grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                {MEASUREMENT_FIELDS.map(({ key, label }) => (
                  <div key={key}>
                    <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
                      {label} <span style={{ opacity: 0.6 }}>(cm)</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      className="themed-input"
                      placeholder="—"
                      value={formValues[key] ?? ""}
                      onChange={(e) => setFormValues((prev) => ({ ...prev, [key]: e.target.value }))}
                      style={{ fontSize: 14 }}
                    />
                  </div>
                ))}
              </div>

              {/* Save button */}
              <button
                type="submit"
                disabled={saving}
                style={{
                  width: "100%",
                  background: "var(--aura-accent)",
                  color: "var(--color-on-accent)",
                  border: "none",
                  borderRadius: 12,
                  padding: 12,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.7 : 1,
                  transition: "opacity 0.2s",
                  minHeight: 44,
                }}
              >
                {saving ? "Saving…" : saveMsg || "Save Measurements"}
              </button>
            </form>

            {/* History chart */}
            <div className="card" style={{ padding: 20, marginTop: 16 }}>
              <h2 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                <History size={16} color="var(--aura-accent)" /> History
              </h2>

              {/* Tab selector */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 8,
                      border: "none",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                      background: activeTab === t.id ? "var(--aura-accent)" : "var(--bg-input)",
                      color: activeTab === t.id ? "#000" : "var(--text-muted)",
                      transition: "background 0.2s, color 0.2s",
                      minHeight: 36,
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Chart or empty state */}
              {hasChartData ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart
                    key={`measurements-${activeTab}-${theme}`}
                    data={chartData}
                    margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => fmtDate(v)}
                      tick={{ fill: colors.tick, fontSize: window.innerWidth < 480 ? 9 : 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      unit=" cm"
                      tick={{ fill: colors.tick, fontSize: window.innerWidth < 480 ? 9 : 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <ReTooltip content={<CustomTooltip />} />
                    {tab.keys.map((k, i) => (
                      <Line
                        key={k}
                        type="monotone"
                        dataKey={k}
                        name={MEASUREMENT_FIELDS.find((f) => f.key === k)?.label || k}
                        stroke={i === 0 ? colors.primary : colors.accent2}
                        strokeWidth={2}
                        dot={{ r: 4, fill: i === 0 ? colors.primary : colors.accent2 }}
                        activeDot={{ r: 6 }}
                        connectNulls={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  justifyContent: "center", gap: 10, padding: "40px 20px",
                  color: "var(--text-muted)",
                }}>
                  <Ruler size={32} color="var(--text-muted)" />
                  <span style={{ fontSize: 13 }}>No measurements logged yet.</span>
                </div>
              )}

              {/* Entry list with delete */}
              {history.length > 0 && (
                <div style={{ marginTop: 16, borderTop: "0.5px solid var(--border-card)", paddingTop: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                    Entries
                  </div>
                  <div style={{ maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
                    {history.map((row) => {
                      const filled = MEASUREMENT_FIELDS.filter(f => row[f.key] != null);
                      const summary = filled.slice(0, 3).map(f => `${f.label} ${row[f.key]}cm`).join(" · ");
                      return (
                        <div key={row.id} style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "7px 10px", borderRadius: 8,
                          background: "var(--bg-input)",
                        }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", minWidth: 72 }}>
                            {fmtDateLong(typeof row.date === "string" ? row.date.slice(0, 10) : row.date)}
                          </span>
                          <span style={{ flex: 1, fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {summary || "No data"}
                          </span>
                          <button
                            onClick={() => handleDelete(row.id)}
                            title="Delete entry"
                            style={{
                              background: "none", border: "none", cursor: "pointer",
                              color: "var(--text-muted)", padding: 4, borderRadius: 6,
                              display: "flex", alignItems: "center", opacity: 0.6,
                              transition: "opacity 0.15s, color 0.15s",
                              flexShrink: 0,
                            }}
                            onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.color = "#EF4444"; }}
                            onMouseLeave={e => { e.currentTarget.style.opacity = "0.6"; e.currentTarget.style.color = "var(--text-muted)"; }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          .measurements-grid {
            grid-template-columns: 1fr !important;
          }
          .measurements-grid > div:first-child svg {
            max-width: 60% !important;
          }
        }
      `}</style>
    </div>
  );
}
