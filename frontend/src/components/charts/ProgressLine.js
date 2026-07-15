import React from "react";
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { fmt } from "../../utils/formatters";
import { useTheme } from '../../utils/theme';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-[var(--bg-primary)]/95 backdrop-blur px-3 py-2 text-xs shadow-xl">
      <div className="text-white/50 mb-2">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-white/60">{p.name}:</span>
          <span className="text-white font-bold">
            {p.dataKey === "volume"
              ? fmt.int(p.value) + " kg"
              : fmt.kg(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function ProgressLine({ data, metric = "max_1rm" }) {
  const { theme } = useTheme();
  
  if (!data?.dates?.length) {
    return (
      <div className="h-48 flex items-center justify-center text-white/20 text-sm">
        Select an exercise to view progress
      </div>
    );
  }

  const chartData = data.dates.map((d, i) => ({
    date: fmt.shortDate(d),
    "e1RM": data.max_1rm?.[i] ?? 0,
    "max weight": data.max_weight?.[i] ?? 0,
    volume: data.total_volume?.[i] ?? 0,
  }));

  const isSmallScreen = window.innerWidth < 480;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart key={`comp-${theme}`}  data={chartData} margin={{ top: 4, right: 4, left: isSmallScreen ? -25 : -16, bottom: 0 }}>
        <defs>
          <linearGradient id="volBarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-input)" />
        <XAxis dataKey="date"
          tick={{ fill: "rgba(255,255,255,0.3)", fontSize: isSmallScreen ? 8 : 10 }}
          axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis yAxisId="weight"
          tick={{ fill: "rgba(255,255,255,0.3)", fontSize: isSmallScreen ? 8 : 10 }}
          axisLine={false} tickLine={false} />
        <YAxis yAxisId="vol" orientation="right"
          tick={{ fill: "rgba(255,255,255,0.15)", fontSize: isSmallScreen ? 7 : 9 }}
          axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: isSmallScreen ? "9px" : "11px", color: "rgba(255,255,255,0.4)" }}
        />
        <Bar yAxisId="vol" dataKey="volume" fill="url(#volBarGrad)"
          radius={[4, 4, 0, 0]} maxBarSize={20} />
        <Line yAxisId="weight" type="monotone" dataKey="e1RM" name="e1RM"
          stroke="#a78bfa" strokeWidth={2.5} dot={{ fill: "#a78bfa", r: 3 }}
          activeDot={{ r: 5 }} />
        <Line yAxisId="weight" type="monotone" dataKey="max weight"
          stroke="#34d399" strokeWidth={1.5} strokeDasharray="4 2"
          dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
