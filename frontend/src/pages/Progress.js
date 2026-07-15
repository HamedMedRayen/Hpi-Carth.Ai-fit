import React, { useState } from "react";
import Header from "../components/layout/Header";
import { Plus } from "lucide-react";
import { useWidgets } from "../hooks/useWidgets";
import AddWidgetModal from "../components/AddWidgetModal";
import WidgetCard from "../components/WidgetCard";

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

function renderWidget(w) {
  const id = typeof w === 'string' ? w : w.id;
  switch (id) {
    case 'workouts_per_week': return <WorkoutsPerWeekWidget />;
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

export default function Progress() {
  const { widgets, addWidget, removeWidget, hasWidget } = useWidgets('progress');
  const [showModal, setShowModal] = useState(false);

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 100 }}>
      <Header title="Progress" subtitle="Customizable dashboard" />
      <div className="page-inner">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 22, fontWeight: 600, margin: 0, color: "var(--color-text)" }}>Dashboard</h2>
          <button onClick={() => setShowModal(true)} style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            background: "var(--accent-primary)", color: "#000",
            border: "none", borderRadius: 10, padding: "8px 14px",
            fontWeight: 600, fontSize: 13, cursor: "pointer", transition: "opacity 0.2s"
          }} onMouseEnter={e => e.currentTarget.style.opacity = 0.8} onMouseLeave={e => e.currentTarget.style.opacity = 1}>
            <Plus size={16} strokeWidth={2.5} />
            Add Widget
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {widgets.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--color-text-3)", padding: 40, background: "var(--color-surface)", borderRadius: 16, border: "1px dashed var(--color-border)" }}>
              No widgets added. Tap the + button to add one.
            </div>
          ) : (
            widgets.map(w => {
              const key = typeof w === 'string' ? w : (w.instanceKey || w.id);
              const id = typeof w === 'string' ? w : w.id;
              return (
                <WidgetCard key={key} id={id} config={w} page="progress" onRemove={() => removeWidget(key)}>
                  {renderWidget(w)}
                </WidgetCard>
              )
            })
          )}
        </div>
      </div>

      {showModal && (
        <AddWidgetModal
          page="progress"
          widgets={widgets}
          hasWidget={hasWidget}
          onAdd={(id) => { addWidget(id); setShowModal(false); }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
