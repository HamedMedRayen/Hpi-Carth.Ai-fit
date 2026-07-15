import React, { useState, useEffect } from "react"
import {
  ComposedChart, Line, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from "recharts"
import { useChartColors } from "../../hooks/useChartColors"
import { useTheme } from "../../utils/theme"
import { API_BASE_URL as API } from "../../utils/config"
import { getSyncItem } from "../../utils/storage"

export default function SleepWidget() {
  const cc = useChartColors()
  const { theme } = useTheme()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSleep = async () => {
      try {
        const token = getSyncItem("aura_token")
        const res = await fetch(`${API}/sleep/correlation`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!res.ok) throw new Error("Failed")
        const json = await res.json()
        
        // Format dates and reverse for chronological order
        const formatted = json.map(d => {
          const dateObj = new Date(d.date)
          return {
            ...d,
            fmtDate: dateObj.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit' }),
            volume_k: d.session_volume ? d.session_volume / 1000 : 0
          }
        }).reverse()
        setData(formatted)
      } catch (e) {
        console.error("Sleep correlation fetch error:", e)
      } finally {
        setLoading(false)
      }
    }
    fetchSleep()
  }, [])

  if (loading) return <div style={{ height: 180, borderRadius: 10, background: 'var(--bg-card-hover)', animation: 'pulse 1.5s ease-in-out infinite' }} />

  return (
    <div style={{ width: "100%", height: 180 }}>
      {data.length === 0 ? (
        <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 13 }}>
          No sleep data logged yet. Head to the Sleep tab to log.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart key={`sleep-${theme}`} data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={cc.border} vertical={false} />
            <XAxis dataKey="fmtDate" tick={{ fill: cc.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fill: cc.tick, fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 12]} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: cc.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: cc.tooltipBg, border: `1px solid ${cc.tooltipBorder}`, borderRadius: 10 }}
              labelStyle={{ color: cc.text }}
              itemStyle={{ fontSize: 13 }}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
            <Bar yAxisId="right" dataKey="volume_k" name="Volume (tons)" fill={cc.accent2} radius={[4, 4, 0, 0]} maxBarSize={30} opacity={0.6} />
            <Line yAxisId="left" type="monotone" dataKey="sleep_hours" name="Sleep (hrs)" stroke={cc.primary} strokeWidth={3} dot={{ r: 4, fill: cc.primary }} activeDot={{ r: 6 }} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
