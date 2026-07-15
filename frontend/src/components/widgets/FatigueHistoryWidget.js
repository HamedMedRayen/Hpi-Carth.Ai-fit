import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Link } from "react-router-dom";
import { Heart, ChevronRight } from "lucide-react";
import { api } from "../../utils/api";
import { useChartColors } from "../../hooks/useChartColors";
import { useTheme } from '../../utils/theme';

export default function FatigueHistoryWidget() {
  const cc = useChartColors();
  const { theme, previewTheme } = useTheme();
  const activeTheme = previewTheme || theme;
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getFatigueHistory().then(res => {
      setData(res);
      setLoading(false);
    }).catch(e => { console.error(e); setLoading(false); });
  }, []);

  if (loading) return <div style={{ height: 220, borderRadius: 10, background: 'var(--bg-card-hover)', animation: 'pulse 1.5s ease-in-out infinite' }} />;

  // Theme-aware status colors
  const statusColor = (level) => {
    if (activeTheme === 'monochrome') {
      if (level === 'None') return '#ffffff';
      if (level === 'Mild') return '#cccccc';
      if (level === 'Moderate') return '#999999';
      return '#666666';
    }
    // For other themes, use a mix of accent or standard colors if appropriate
    // But user wants it to MATCH the theme.
    const base = 'var(--aura-accent)';
    if (level === 'None') return `color-mix(in srgb, ${base}, #22C55E)`;
    if (level === 'Mild') return `color-mix(in srgb, ${base}, #EAB308)`;
    if (level === 'Moderate') return `color-mix(in srgb, ${base}, #F97316)`;
    return `color-mix(in srgb, ${base}, #EF4444)`;
  };

  const getStyle = (level) => {
    const color = statusColor(level);
    return {
      bg: `color-mix(in srgb, ${color} 15%, transparent)`,
      border: `color-mix(in srgb, ${color} 30%, transparent)`,
      text: color,
      color: color
    };
  };

  const chartData = [...data].reverse().map(log => {
    const d = new Date(log.logged_at);
    return {
      ...log,
      fmtDate: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      fmtTime: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
      tooltipDate: d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }),
    };
  });

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const log = payload[0].payload;
      const style = getStyle(log.label);
      return (
        <div style={{ background: cc.tooltipBg, border: `1px solid ${cc.tooltipBorder}`, borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 12, color: cc.textMuted, marginBottom: 6 }}>{log.tooltipDate}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600,
              background: style.bg, border: `1px solid ${style.border}`, color: style.text
            }}>
              {log.label}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: cc.text }}>
              Borg: {log.borg_score}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <Link to="/fatigue-check" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--aura-accent)", textDecoration: "none", fontWeight: 500 }}>
          Take a check <ChevronRight size={14} />
        </Link>
      </div>

      {data.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "20px 0" }}>
          <Heart size={32} color="var(--color-text-3)" />
          <div style={{ color: "var(--color-text-2)", fontSize: 14 }}>No fatigue checks yet.</div>
          <Link to="/fatigue-check" style={{ color: "var(--aura-accent)", fontSize: 13, textDecoration: "none" }}>Take your first check →</Link>
        </div>
      ) : (
        <div style={{ height: 220, width: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart key={`line-${activeTheme}`} data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={cc.border} />
              <XAxis dataKey="fmtDate" tick={{ fill: cc.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[6, 20]} tick={{ fill: cc.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="borg_score"
                stroke={cc.primary}
                strokeWidth={3}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  const color = statusColor(payload.label);
                  return (
                    <circle cx={cx} cy={cy} r={5} fill={color} stroke={cc.surface} strokeWidth={2} key={`dot-${payload.id}`} />
                  );
                }}
                activeDot={{ r: 7, fill: cc.primary, stroke: cc.surface, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
