import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { api } from "../../utils/api";
import { useChartColors } from "../../hooks/useChartColors";
import { useTheme } from '../../utils/theme';

export default function WeeklyVolumeWidget() {
  const cc = useChartColors();
  const { theme } = useTheme();
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getWeeklyVolume().then(res => {
      setData(res);
      setLoading(false);
    }).catch(e => { console.error(e); setLoading(false); });
  }, []);

  if (loading) return <div style={{ height: 180, borderRadius: 10, background: 'var(--bg-card-hover)', animation: 'pulse 1.5s ease-in-out infinite' }} />;

  const chartData = [
    { name: "Last", volume: data?.last_week?.volume || 0, fill: cc.primary },
    { name: "This", volume: data?.this_week?.volume || 0, fill: cc.accent2 }
  ];

  return (
    <div style={{ width: "100%", height: 180 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart key={`bar-${theme}`} data={chartData} barSize={32} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fill: cc.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: cc.tick, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}t` : v} />
          <Tooltip
            cursor={{ fill: cc.surface }}
            contentStyle={{ background: cc.tooltipBg, border: `1px solid ${cc.tooltipBorder}`, borderRadius: 10 }}
            itemStyle={{ color: cc.text }}
            formatter={(val) => [`${Math.round(val)} kg`, "Volume"]}
          />
          <Bar dataKey="volume" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
