import React, { useState, useEffect } from "react";
import { ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { api } from "../../utils/api";
import { useChartColors } from "../../hooks/useChartColors";
import { useTheme } from '../../utils/theme';
import ExercisePicker from "../widgets/ExercisePicker";

export default function WeightRepsWidget() {
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
    api.getProgressSessionHistory(exerciseId).then(res => {
      const formatted = res.map(d => {
        const dateObj = new Date(d.date);
        return {
          ...d,
          fmtDate: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          weight: Number(d.weight.toFixed(1)),
          reps: Number(d.reps.toFixed(1))
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
              No session data for this exercise.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart key={`comp-${theme}`} data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke={cc.border} />
                <XAxis dataKey="fmtDate" tick={{ fill: cc.tick, fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fill: cc.tick, fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: cc.tick, fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: cc.tooltipBg, border: `1px solid ${cc.tooltipBorder}`, borderRadius: 10 }}
                  labelStyle={{ color: cc.textMuted }}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: cc.textDim }} />
                <Bar yAxisId="right" dataKey="reps" fill={cc.barFill} name="Reps" />
                <Line yAxisId="left" type="monotone" dataKey="weight" stroke={cc.accent2} strokeWidth={2} dot={{ r: 4, fill: cc.accent2 }} name="Weight (kg)" />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  );
}
