import React, { useState, useEffect } from "react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { api } from "../../utils/api"
import { useChartColors } from "../../hooks/useChartColors"
import { useTheme } from '../../utils/theme'

const ENDPOINTS = {
  est_1rm: 'best-set-1rm',
  max_weight: 'best-set-weight',
  total_volume: 'volume',
  best_reps: 'best-set-reps',
}

const Y_LABELS = {
  est_1rm: 'Est. 1RM (kg)',
  max_weight: 'Max Weight (kg)',
  total_volume: 'Volume (kg)',
  best_reps: 'Best Reps',
}

export default function ExerciseTrackerWidget({ exerciseId, exerciseName, metric }) {
  const cc = useChartColors()
  const { theme } = useTheme()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!exerciseId || !metric) {
      setLoading(false)
      return
    }
    const endpoint = ENDPOINTS[metric]
    api.getExerciseTrackerData(exerciseId, endpoint)
      .then(res => {
        const formatted = res.map(d => {
          const dateObj = new Date(d.date)
          return {
            ...d,
            fmtDate: dateObj.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit' })
          }
        })
        setData(formatted)
        setLoading(false)
      })
      .catch(e => {
        console.error(e)
        setLoading(false)
      })
  }, [exerciseId, metric])

  if (loading) return <div style={{ height: 180, borderRadius: 10, background: 'var(--bg-card-hover)', animation: 'pulse 1.5s ease-in-out infinite' }} />

  return (
    <div style={{ width: "100%", height: 180 }}>
      {data.length === 0 ? (
        <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 13 }}>
          No data yet for this exercise.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart key={`line-${theme}`} data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={cc.border} />
            <XAxis dataKey="fmtDate" tick={{ fill: cc.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: cc.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: cc.tooltipBg, border: `1px solid ${cc.tooltipBorder}`, borderRadius: 10 }}
              labelStyle={{ color: cc.textMuted }}
              itemStyle={{ color: cc.primary }}
              formatter={(value) => [Number(value).toFixed(1), Y_LABELS[metric] || '']}
            />
            <Line type="monotone" dataKey="value" stroke="var(--accent-primary)" strokeWidth={2} dot={false} activeDot={{ r: 6, fill: 'var(--accent-primary)' }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
