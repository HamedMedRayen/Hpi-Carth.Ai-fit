import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { api } from "../../utils/api";
import { useChartColors } from "../../hooks/useChartColors";
import { useTheme } from '../../utils/theme';

export default function WorkoutsPerWeekWidget() {
  const cc = useChartColors();
  const { theme } = useTheme();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getProgressWorkoutsPerWeek()
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ height: 200, borderRadius: 10, background: 'var(--bg-card-hover)', animation: 'pulse 1.5s ease-in-out infinite' }} />;

  return (
    <div style={{ width: "100%", height: 200 }}>
      {data.length === 0 ? (
        <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-3)", fontSize: 13 }}>
          No workout sessions logged yet.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart key={`bar-${theme}`}  data={data} barSize={24} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={cc.border} vertical={false} />
            <XAxis dataKey="week" tick={{ fill: cc.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: cc.tick, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: cc.tooltipBg, border: `1px solid ${cc.tooltipBorder}`, borderRadius: 10 }}
              labelStyle={{ color: cc.textMuted }}
              itemStyle={{ color: cc.primary }}
              formatter={(value) => [`${value} workouts`, ""]}
            />
            <Bar dataKey="count" fill={cc.primary} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
