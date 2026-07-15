import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { api } from "../../utils/api";
import { useChartColors } from "../../hooks/useChartColors";
import { useTheme } from '../../utils/theme';

export default function WeightOverTimeWidget() {
  const cc = useChartColors();
  const { theme } = useTheme();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getProgressWeightHistory().then(res => {
      const formatted = res.map(d => {
        const dateObj = new Date(d.date);
        return {
          ...d,
          fmtDate: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        };
      });
      setData(formatted);
      setLoading(false);
    }).catch(e => { console.error(e); setLoading(false); });
  }, []);

  if (loading) return <div style={{ height: 180, borderRadius: 10, background: 'var(--bg-card-hover)', animation: 'pulse 1.5s ease-in-out infinite' }} />;

  return (
    <div style={{ width: "100%", height: 220 }}>
      {data.length === 0 ? (
        <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-3)", fontSize: 13 }}>
          No weight entries yet.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart key={`line-${theme}`} data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={cc.border} />
            <XAxis dataKey="fmtDate" tick={{ fill: cc.tick, fontSize: 11 }} />
            <YAxis tick={{ fill: cc.tick, fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: cc.tooltipBg, border: `1px solid ${cc.tooltipBorder}`, borderRadius: 10 }}
              labelStyle={{ color: cc.textMuted }}
              itemStyle={{ color: cc.accent2 }}
            />
            <Line type="monotone" dataKey="weight" stroke={cc.accent2} strokeWidth={2} dot={{ r: 4, fill: cc.accent2 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
