import React, { useState, useEffect } from "react";
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "../../utils/api";
import { useChartColors } from "../../hooks/useChartColors";
import { useTheme } from '../../utils/theme';

export default function VolumeProgressionWidget() {
  const cc = useChartColors();
  const { theme } = useTheme();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getVolumeHistory().then(res => {
      setData(res);
      setLoading(false);
    }).catch(e => { console.error(e); setLoading(false); });
  }, []);

  if (loading) return <div style={{ height: 220, borderRadius: 10, background: 'var(--bg-card-hover)', animation: 'pulse 1.5s ease-in-out infinite' }} />;

  return (
    <div style={{ width: "100%", height: 220 }}>
      {data.length === 0 ? (
        <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-3)", fontSize: 13 }}>
          No volume data yet.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart key={`comp-${theme}`} data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={cc.border} />
            <XAxis dataKey="date" tick={{ fill: cc.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: cc.tick, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}t` : v} />
            <Tooltip
              contentStyle={{ background: cc.tooltipBg, border: `1px solid ${cc.tooltipBorder}`, borderRadius: 10 }}
              labelStyle={{ color: cc.textMuted }}
              itemStyle={{ color: cc.accent2 }}
            />
            <Area type="monotone" dataKey="volume" fill={cc.areaFill} stroke={cc.accent2} strokeWidth={2} />
            <Line type="monotone" dataKey="volume" stroke={cc.primary} strokeDasharray="5 5" strokeWidth={1.5} dot={false} activeDot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
