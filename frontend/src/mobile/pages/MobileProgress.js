import React, { useState } from "react";
import { Plus, Moon, AlertTriangle, Activity, Settings2, Trash2 } from "lucide-react";
import { useWidgets } from "../../hooks/useWidgets";
import AddWidgetModal from "../../components/AddWidgetModal";
import WidgetCard from "../../components/WidgetCard";

import VolumeProgressionWidget from "../../components/widgets/VolumeProgressionWidget";
import WeeklyVolumeWidget from "../../components/widgets/WeeklyVolumeWidget";
import TrainingSplitWidget from "../../components/widgets/TrainingSplitWidget";
import ActivityMapWidget from "../../components/widgets/ActivityMapWidget";
import StreakTrackerWidget from "../../components/widgets/StreakTrackerWidget";
import FatigueHistoryWidget from "../../components/widgets/FatigueHistoryWidget";
import WorkoutsPerWeekWidget from "../../components/widgets/WorkoutsPerWeekWidget";
import WeightOverTimeWidget from "../../components/widgets/WeightOverTimeWidget";
import RepsOverTimeWidget from "../../components/widgets/RepsOverTimeWidget";
import WeightRepsWidget from "../../components/widgets/WeightRepsWidget";
import ExerciseTrackerWidget from "../../components/widgets/ExerciseTrackerWidget";
import SleepWidget from "../../components/widgets/SleepWidget";
import BodyMapWidget from "../../components/widgets/BodyMapWidget";

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

export default function MobileProgress({ navigateToPage }) {
  const { widgets, addWidget, removeWidget, hasWidget } = useWidgets('progress');
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="mobile-page" style={{ paddingBottom: 120 }}>
      {/* Header */}
      <div style={{ padding: "16px 0", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px", color: "var(--color-text)", letterSpacing: "-0.02em" }}>Progress</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: 0 }}>Analyze trends and track performance analytics.</p>
        </div>
        
        <button 
          onClick={() => setShowModal(true)} 
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
            background: "var(--aura-accent)", color: "var(--color-bg)",
            border: "none", borderRadius: 10, padding: "8px 12px",
            fontWeight: 800, fontSize: 12, cursor: "pointer", transition: "opacity 0.2s"
          }}
        >
          <Plus size={14} /> Add Widget
        </button>
      </div>

      {/* Quick Logs Bar (Sleep and Injury Map shortcuts) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        <button 
          onClick={() => navigateToPage ? navigateToPage("sleep") : window.location.hash = "/sleep"}
          style={{ 
            background: "var(--color-surface)", 
            border: "1px solid rgba(255,255,255,0.06)", 
            borderRadius: 12, 
            padding: "10px 12px", 
            color: "var(--color-text)", 
            display: "flex", 
            alignItems: "center", 
            gap: 8,
            cursor: "pointer",
            textAlign: "left"
          }}
        >
          <Moon size={16} color="var(--aura-cyan)" style={{ flexShrink: 0 }} />
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: 11, fontWeight: 800 }}>Sleep Tracker</div>
            <div style={{ fontSize: 9, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>Log Recovery &gt;</div>
          </div>
        </button>

        <button 
          onClick={() => navigateToPage ? navigateToPage("injuries") : window.location.hash = "/injuries"}
          style={{ 
            background: "var(--color-surface)", 
            border: "1px solid rgba(255,255,255,0.06)", 
            borderRadius: 12, 
            padding: "10px 12px", 
            color: "var(--color-text)", 
            display: "flex", 
            alignItems: "center", 
            gap: 8,
            cursor: "pointer",
            textAlign: "left"
          }}
        >
          <AlertTriangle size={16} color="var(--aura-accent3)" style={{ flexShrink: 0 }} />
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: 11, fontWeight: 800 }}>Injury Map</div>
            <div style={{ fontSize: 9, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>Log Pain &gt;</div>
          </div>
        </button>
      </div>

      {/* Widgets list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {widgets.length === 0 ? (
          <div style={{ 
            textAlign: "center", 
            color: "var(--text-secondary)", 
            padding: "40px 16px", 
            background: "var(--color-surface)", 
            borderRadius: 16, 
            border: "1px dashed rgba(255,255,255,0.1)" 
          }}>
            <Settings2 size={32} style={{ margin: "0 auto 8px", opacity: 0.2, color: "var(--color-text)" }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text)", marginBottom: 4 }}>No Widgets Active</div>
            <p style={{ fontSize: 12, margin: 0 }}>Customize your mobile analytics. Tap 'Add Widget' above to select your primary charts.</p>
          </div>
        ) : (
          widgets.map(w => {
            const key = typeof w === 'string' ? w : (w.instanceKey || w.id);
            const id = typeof w === 'string' ? w : w.id;
            return (
              <WidgetCard key={key} id={id} config={w} page="progress" onRemove={() => removeWidget(key)}>
                <div style={{ 
                  marginTop: 10, 
                  background: "rgba(0,0,0,0.15)", 
                  padding: 12, 
                  borderRadius: 16, 
                  border: "1px solid rgba(255,255,255,0.02)",
                  overflow: "hidden"
                }}>
                  {renderWidget(w)}
                </div>
              </WidgetCard>
            )
          })
        )}
      </div>

      {/* Modal Selection sheet overlay */}
      {showModal && (
        <AddWidgetModal
          page="progress"
          widgets={widgets}
          hasWidget={hasWidget}
          onAdd={(id, config) => { addWidget(id, config); setShowModal(false); }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
