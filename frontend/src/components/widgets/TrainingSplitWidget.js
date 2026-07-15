import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "../../utils/api";
import { useChartColors } from "../../hooks/useChartColors";
import { useTheme } from '../../utils/theme';

export default function TrainingSplitWidget() {
  const cc = useChartColors();
  const { theme } = useTheme();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // These are semantic category colors — they're intentionally distinct per muscle group,
  // not theme-dependent, so they remain as-is for data visualization.
  const COLORS = {
    back: "#22C55E", chest: "#7C3AED", legs: "#00BCD4", shoulders: "#F97316", arms: "#EAB308", waist: "#EF4444", other: "#6B7280"
  };

  useEffect(() => {
    api.getTrainingSplit().then(res => {
      setData(res);
      setLoading(false);
    }).catch(e => { console.error(e); setLoading(false); });
  }, []);

  if (loading) return <div style={{ height: 180, borderRadius: 10, background: 'var(--bg-card-hover)', animation: 'pulse 1.5s ease-in-out infinite' }} />;

  const normalizedData = data.map(d => {
    let name = d.name.toLowerCase();
    if (name.includes("arm")) name = "arms";
    if (name.includes("leg") || name.includes("calf")) name = "legs";
    return { ...d, name };
  });

  const aggData = [];
  normalizedData.forEach(d => {
    const existing = aggData.find(x => x.name === d.name);
    if (existing) existing.value += d.value;
    else aggData.push({ ...d });
  });

  const total = aggData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div style={{ width: "100%", height: 180, display: "flex", flexDirection: "row", alignItems: "center" }}>
      {total === 0 ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-3)", fontSize: 12 }}>No data</div>
      ) : (
        <>
          <div style={{ width: "50%", height: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart key={`pie-${theme}`}>
                <Pie data={aggData} cx="50%" cy="50%" innerRadius={35} outerRadius={50} paddingAngle={2} dataKey="value" stroke="none">
                  {aggData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.name] || COLORS.other} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "var(--color-bg3)", border: "none", borderRadius: 8, fontSize: 12 }}
                  itemStyle={{ color: "var(--color-text)" }}
                  formatter={(val) => [`${Math.round((val / total) * 100)}%`, ""]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ width: "50%", display: "flex", flexDirection: "column", gap: 4, paddingLeft: 10 }}>
            {aggData.slice(0, 4).map(d => (
              <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS[d.name] || COLORS.other }} />
                <span style={{ fontSize: 11, color: "var(--color-text)", textTransform: "capitalize", flex: 1 }}>{d.name}</span>
                <span style={{ fontSize: 11, color: "var(--color-text-2)" }}>{Math.round((d.value / total) * 100)}%</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
