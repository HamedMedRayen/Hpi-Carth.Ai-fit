import React, { useState, useEffect } from "react";
import { 
  Calendar, ChevronLeft, ChevronRight, TrendingUp, Flame, Apple, 
  Carrot, Award, CheckCircle2, ThumbsUp, ThumbsDown, BarChart2,
  Clock, Footprints, History
} from "lucide-react";
import { api } from "../../utils/api";

export default function WeeklyReportView({ targets, history, onSelectDate }) {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWeeklyStats();
  }, [history]);

  const loadWeeklyStats = async () => {
    setLoading(true);
    try {
      const hist = history && history.length > 0 ? history : await api.getNutritionHistory();
      
      // Calculate totals for past 7 days
      const last7Days = (hist || []).slice(0, 7);
      const totalLoggedKcal = last7Days.reduce((sum, item) => sum + (parseFloat(item.calories) || 0), 0);
      const weeklyGoalKcal = (targets.calories || 2000) * 7;
      const totalProtein = last7Days.reduce((sum, item) => sum + (parseFloat(item.protein_g) || 0), 0);
      const totalCarbs = last7Days.reduce((sum, item) => sum + (parseFloat(item.carbs_g) || 0), 0);
      const totalFat = last7Days.reduce((sum, item) => sum + (parseFloat(item.fat_g) || 0), 0);

      setReportData({
        days: last7Days,
        totalLoggedKcal: Math.round(totalLoggedKcal),
        weeklyGoalKcal: Math.round(weeklyGoalKcal),
        totalBurnedKcal: 350,
        daysCount: last7Days.length,
        totalProtein: Math.round(totalProtein),
        totalCarbs: Math.round(totalCarbs),
        totalFat: Math.round(totalFat)
      });
    } catch (e) {
      console.error("Failed to load weekly report stats", e);
    } finally {
      setLoading(false);
    }
  };

  const todayDate = new Date();
  const startDate = new Date(todayDate);
  startDate.setDate(todayDate.getDate() - 6);
  const rangeStr = `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${todayDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ── HEADER RANGE ── */}
      <div className="card" style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: 18 }}>
        <button style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer" }}><ChevronLeft size={20} /></button>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: 16, color: "#fff" }}>
          <Calendar size={18} color="var(--aura-accent, #00f2fe)" />
          <span>{rangeStr}</span>
        </div>
        <button style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer" }}><ChevronRight size={20} /></button>
      </div>

      {/* ── WEEK AT A GLANCE ── */}
      <div className="card" style={{ padding: 24, borderRadius: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: "#fff", margin: "0 0 16px" }}>Week At A Glance</h3>
        <p style={{ fontSize: 12, color: "#aaa", margin: "-10px 0 16px" }}>
          {reportData ? `You logged ${reportData.daysCount} of 7 days this week.` : "Weekly Overview"}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
          <div style={{ background: "rgba(0, 242, 254, 0.06)", border: "1px solid rgba(0, 242, 254, 0.2)", borderRadius: 16, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#aaa", textTransform: "uppercase" }}>Goal</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "var(--aura-accent, #00f2fe)", marginTop: 4 }}>
              {reportData ? (reportData.weeklyGoalKcal || 0).toLocaleString() : "14,000"}
            </div>
            <div style={{ fontSize: 10, color: "#aaa", marginTop: 2 }}>kcal / week</div>
          </div>

          <div style={{ background: "rgba(81, 207, 102, 0.06)", border: "1px solid rgba(81, 207, 102, 0.2)", borderRadius: 16, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#aaa", textTransform: "uppercase" }}>Logged</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#51cf66", marginTop: 4 }}>
              {reportData ? (reportData.totalLoggedKcal || 0).toLocaleString() : "0"}
            </div>
            <div style={{ fontSize: 10, color: "#aaa", marginTop: 2 }}>kcal logged</div>
          </div>

          <div style={{ background: "rgba(255, 107, 107, 0.06)", border: "1px solid rgba(255, 107, 107, 0.2)", borderRadius: 16, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#aaa", textTransform: "uppercase" }}>Burned</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#ff6b6b", marginTop: 4 }}>
              {reportData ? reportData.totalBurnedKcal : "0"}
            </div>
            <div style={{ fontSize: 10, color: "#aaa", marginTop: 2 }}>kcal burned</div>
          </div>
        </div>
      </div>


      {/* ── DAYS ARCHIVE & LOGS HISTORY ── */}
      <div className="card" style={{ padding: 24, borderRadius: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <History size={18} color="var(--aura-accent, #00f2fe)" /> Days Archive & Log History
          </h3>
          <span style={{ fontSize: 12, color: "#aaa" }}>Past 30 Days</span>
        </div>

        {(!history || history.length === 0) ? (
          <div style={{ textTransform: "capitalize", padding: "20px 0", textAlign: "center", color: "#aaa", fontSize: 13 }}>
            No past nutrition logs found yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {history.map((dayItem, idx) => {
              const dayKcal = Math.round(parseFloat(dayItem.calories) || 0);
              const dayStr = dayItem.date ? String(dayItem.date).split("T")[0] : `Day ${idx + 1}`;
              const targetKcal = targets.calories || 2000;
              const diffPct = Math.min(100, Math.round((dayKcal / targetKcal) * 100));

              return (
                <div 
                  key={dayStr + idx}
                  onClick={() => onSelectDate && onSelectDate(dayStr)}
                  style={{
                    padding: "12px 16px",
                    borderRadius: 14,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                  className="archive-row"
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: "#fff" }}>{dayStr}</div>
                    <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>
                      P: {Math.round(dayItem.protein_g || 0)}g • C: {Math.round(dayItem.carbs_g || 0)}g • F: {Math.round(dayItem.fat_g || 0)}g
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 900, fontSize: 15, color: "var(--aura-accent, #00f2fe)" }}>
                      {dayKcal} kcal
                    </div>
                    <div style={{ fontSize: 10, color: diffPct > 100 ? "#ff4d4f" : "#51cf66", fontWeight: 700 }}>
                      {diffPct}% of daily goal
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        .archive-row:hover {
          background: rgba(255,255,255,0.07) !important;
          border-color: var(--aura-accent, #00f2fe) !important;
        }
      `}</style>
    </div>
  );
}

function CategoryStatRow({ name, count, color, pct }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
        <span style={{ color: "#fff" }}>{name}</span>
        <span style={{ color: color }}>{count}</span>
      </div>
      <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color }} />
      </div>
    </div>
  );
}
