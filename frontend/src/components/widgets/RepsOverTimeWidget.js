import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { api } from "../../utils/api";
import { useChartColors } from "../../hooks/useChartColors";
import { useTheme } from '../../utils/theme';
import ExercisePicker from "../ExercisePicker";

export default function RepsOverTimeWidget() {
  const cc = useChartColors();
  const { theme } = useTheme();
  const [exerciseId, setExerciseId] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!exerciseId) {
      setData([]);
      return;
    }
    setLoading(true);
    api.getProgressRepsHistory(exerciseId).then(res => {
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
  }, [exerciseId]);

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <ExercisePicker value={exerciseId} onChange={setExerciseId} />
      </div>
      {loading ? (
        <div style={{ height: 180, borderRadius: 10, background: 'var(--bg-card-hover)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      ) : (
        <div style={{ width: "100%", height: 220 }}>
          {!exerciseId || data.length === 0 ? (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-3)", fontSize: 13 }}>
              No rep data for this exercise.
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
                  itemStyle={{ color: cc.primary }}
                />
                <Line type="monotone" dataKey="reps" stroke={cc.primary} strokeWidth={2} dot={{ r: 4, fill: cc.primary }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  );
}
