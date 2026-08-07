import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../utils/auth";
import { api } from "../utils/api";
import {
  Plus, Dumbbell, Flame, Clock, Zap,
  Brain, AlertCircle, Scale, Activity,
  ChevronRight, Calendar, TrendingUp
} from "lucide-react";
import { useWidgets } from "../hooks/useWidgets";
import { useTheme } from "../utils/theme";
import AddWidgetModal from "../components/modals/AddWidgetModal";
import WidgetCard from "../components/widgets/WidgetCard";
import ChallengeCheckinWidget from "../components/widgets/ChallengeCheckinWidget";
import InlineHpiChat from "../components/coach/InlineHpiChat";

import VolumeProgressionWidget from "../components/widgets/VolumeProgressionWidget";
import WeeklyVolumeWidget from "../components/widgets/WeeklyVolumeWidget";
import TrainingSplitWidget from "../components/widgets/TrainingSplitWidget";
import ActivityMapWidget from "../components/widgets/ActivityMapWidget";
import StreakTrackerWidget from "../components/widgets/StreakTrackerWidget";
import FatigueHistoryWidget from "../components/widgets/FatigueHistoryWidget";
import WorkoutsPerWeekWidget from "../components/widgets/WorkoutsPerWeekWidget";
import WeightOverTimeWidget from "../components/widgets/WeightOverTimeWidget";
import RepsOverTimeWidget from "../components/widgets/RepsOverTimeWidget";
import WeightRepsWidget from "../components/widgets/WeightRepsWidget";
import ExerciseTrackerWidget from "../components/widgets/ExerciseTrackerWidget";
import SleepWidget from "../components/widgets/SleepWidget";
import BodyMapWidget from "../components/widgets/BodyMapWidget";

const STAT_FMT = {
  kg: (val) => val >= 1000 ? `${(val / 1000).toFixed(1)}t` : `${Math.round(val)}kg`,
};

function renderWidget(w) {
  const id = typeof w === 'string' ? w : w.id;
  switch (id) {
    case 'workouts_per_week': return <WorkoutsPerWeekWidget />;
    case 'body_map': return <BodyMapWidget />;
    case 'weight_over_time': return <WeightOverTimeWidget />;
    case 'reps_over_time': return <RepsOverTimeWidget />;
    case 'weight_reps_combined': return <WeightRepsWidget />;
    case 'volume_progression': return <VolumeProgressionWidget />;
    case 'weekly_volume': return <WeeklyVolumeWidget />;
    case 'training_split': return <TrainingSplitWidget />;
    case 'activity_map': return <ActivityMapWidget />;
    case 'streak_tracker': return <StreakTrackerWidget />;
    case 'fatigue_history': return <FatigueHistoryWidget />;
    case 'exercise_tracker': return <ExerciseTrackerWidget exerciseId={w.exerciseId} exerciseName={w.exerciseName} metric={w.metric} />;
    case 'sleep_tracker': return <SleepWidget />;
    default: return null;
  }
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();

  const [stats, setStats] = useState({});
  const [dashboardData, setDashboardData] = useState(null);
  const { widgets, addWidget, removeWidget, hasWidget } = useWidgets('dashboard');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    api.getDashboardStats().then(setStats).catch(() => { });
    api.getDashboardAnalytics(user?.id).then(setDashboardData).catch(() => { });
  }, [user?.id]);

  const todayStr = useMemo(() => new Date().toLocaleDateString("en-US", {
    weekday: 'long', month: 'long', day: 'numeric'
  }), []);

  const statItems = [
    { icon: <Dumbbell size={18} />, color: "var(--aura-accent)", value: STAT_FMT.kg(stats.total_volume_kg || 0), label: "TOTAL VOLUME", sub: "lifetime" },
    { icon: <Flame size={18} />, color: "var(--aura-accent3)", value: stats.total_sessions || 0, label: "SESSIONS", sub: `${stats.last_session_days_ago === 0 ? "today" : `${stats.last_session_days_ago || 0}d ago`}` },
    { icon: <Clock size={18} />, color: "var(--aura-accent2)", value: `${stats.avg_duration_minutes || 0}m`, label: "AVG DURATION", sub: "per session" },
    { icon: <Zap size={18} />, color: "var(--aura-accent4)", value: `${stats.current_streak_days || 0}d`, label: "STREAK", sub: "consecutive" },
  ];

  return (
    <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Header Row ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-3)', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
            <Calendar size={13} /> {todayStr}
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Command Center</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-primary" onClick={() => navigate('/log')}
            style={{ padding: '10px 20px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, width: 'auto' }}>
            <Plus size={16} /> Log Workout
          </button>
          <button onClick={() => setShowModal(true)}
            style={{ padding: '10px 14px', borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--color-border)', color: 'var(--color-text-2)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Activity size={14} /> Widgets
          </button>
        </div>
      </div>

      {/* ═══ TWO-COLUMN LAYOUT: Left = data, Right = AI chat ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, alignItems: 'start' }}>

        {/* ── LEFT COLUMN: Stats + Widgets ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Core Stats — Horizontal compact row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {statItems.map((s, i) => (
              <div key={i} className="right-card" style={{
                position: 'relative',
                overflow: 'hidden',
              }}>
                {/* Accent glow line at top */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                  background: s.color, opacity: 0.6,
                }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--color-text-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{s.label}</span>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: `color-mix(in srgb, ${s.color} 10%, transparent)`,
                    color: s.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{s.icon}</div>
                </div>
                <div className="font-display" style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, marginBottom: 2 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 500 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* AI Insight */}
          <div className="right-card" style={{
            display: 'flex', gap: 14, alignItems: 'center',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(var(--aura-accent-rgb), 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--aura-accent)', flexShrink: 0,
            }}>
              <Brain size={20} />
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 900, color: 'var(--aura-accent)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 3 }}>Hpi Intelligence</div>
              <div aria-live="polite" style={{ fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.5 }}>
                {dashboardData?.ai_insight || "Analyzing your data for precision insights..."}
              </div>
            </div>
          </div>

          {/* Challenge Check-in */}
          <ChallengeCheckinWidget />

          {/* Injury Alert */}
          {dashboardData?.active_injuries_count > 0 && (
            <div onClick={() => navigate('/injuries')} className="injury-alert" style={{
              background: 'var(--bg-card)', border: '1px solid rgba(255,0,0,0.15)',
              borderRadius: 14, padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
            }}>
              <AlertCircle size={16} color="var(--aura-accent3)" className="injury-icon" />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--aura-accent3)' }}>
                {dashboardData.active_injuries_count} active {dashboardData.active_injuries_count === 1 ? 'injury' : 'injuries'}
              </span>
              <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.3 }} />
            </div>
          )}

          {/* Quick Actions */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {[
              { label: "Log", icon: <Plus size={14} />, path: "/log", color: "var(--aura-accent)" },
              { label: "Weight", icon: <Scale size={14} />, path: "/measurements", color: "var(--aura-accent2)" },
              { label: "Fatigue", icon: <Activity size={14} />, path: "/fatigue-check", color: "var(--aura-accent4)" },
              { label: "Injuries", icon: <AlertCircle size={14} />, path: "/injuries", color: "var(--aura-accent3)" },
            ].map(a => (
              <button key={a.path} onClick={() => navigate(a.path)} style={{
                padding: '10px 8px', borderRadius: 12,
                background: 'var(--bg-card)', border: '1px solid var(--color-border)',
                color: 'var(--color-text-2)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 6, cursor: 'pointer',
                fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
              }}>
                <span style={{ color: a.color }}>{a.icon}</span>
                {a.label}
              </button>
            ))}
          </div>

          {/* Custom Widgets Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            {widgets.filter(w => (typeof w === 'string' ? w : w.id) !== 'body_map').map(w => {
              const key = typeof w === 'string' ? w : (w.instanceKey || w.id);
              const id = typeof w === 'string' ? w : w.id;
              return (
                <WidgetCard key={key} id={id} config={w} page="dashboard" onRemove={() => removeWidget(key)}>
                  {renderWidget(w)}
                </WidgetCard>
              );
            })}
          </div>

          {widgets.length === 0 && (
            <div className="right-card" style={{ textAlign: "center", color: "var(--color-text-3)", padding: 40, borderStyle: "dashed" }}>
              <TrendingUp size={24} style={{ marginBottom: 10, opacity: 0.2 }} />
              <p style={{ fontWeight: 600, fontSize: 13, margin: '0 0 4px' }}>Your workspace is clean.</p>
              <p style={{ fontSize: 12, margin: 0 }}>Add widgets to build your command center.</p>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN: Fixed Side Body Map + Inline AI Chat ── */}
        <div style={{ position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="right-card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Activity size={16} color="var(--aura-accent)" />
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text)' }}>Body Map</span>
              </div>
            </div>
            <BodyMapWidget />
          </div>
          <InlineHpiChat />
        </div>
      </div>

      {showModal && (
        <AddWidgetModal
          page="dashboard"
          widgets={widgets}
          hasWidget={hasWidget}
          onAdd={(id) => { addWidget(id); setShowModal(false); }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
