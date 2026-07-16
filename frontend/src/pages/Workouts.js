import React, { useState, useEffect } from "react";
import Header from "../components/layout/Header";
import GlassCard from "../components/layout/GlassCard";
import WorkoutCard from "../components/cards/WorkoutCard";
import { useWorkouts, useWorkoutDetail } from "../hooks/useWorkouts";
import { api } from "../utils/api";
import { fmt } from "../utils/formatters";
import { useToast } from "../components/Toast";
import { SearchIcon, BackIcon, TrashIcon } from "../utils/icons";

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 160 }}>
      <div className="spinner" />
    </div>
  );
}

function SetRow({ set }) {
  if (["W", "Rest Timer"].includes(set.set_order)) return null;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: "9px 0",
      borderBottom: "0.5px solid var(--color-border)"
    }}>
      <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--color-text-3)", width: 20, flexShrink: 0 }}>
        {set.set_order}
      </span>
      <span style={{ fontWeight: 600, fontSize: 14, color: "var(--color-text)", width: 72 }}>
        {set.weight_kg > 0 ? fmt.kg(set.weight_kg) : "BW"}
      </span>
      <span style={{ fontSize: 13, color: "var(--color-text-2)" }}>× {set.reps} reps</span>
      {set.rpe && (
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--aura-accent4)" }}>RPE {set.rpe}</span>
      )}
      {set.one_rm_est > 0 && (
        <span style={{ fontSize: 11, color: "var(--aura-accent)", marginLeft: "auto" }}>
          e1RM {fmt.kg(set.one_rm_est)}
        </span>
      )}
    </div>
  );
}

function ExerciseBlock({ name, sets }) {
  const [open, setOpen] = useState(false);
  const working = sets.filter(s => !["W", "Rest Timer"].includes(s.set_order));
  const maxW = Math.max(...working.map(s => s.weight_kg), 0);
  const vol = working.reduce((a, s) => a + s.volume_load, 0);
  return (
    <div style={{ marginBottom: 8 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "none", border: "none", cursor: "pointer", padding: "8px 0", textAlign: "left"
        }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>{name}</div>
          <div style={{ fontSize: 11, color: "var(--color-text-3)", marginTop: 2 }}>
            {working.length} sets · {fmt.kg(maxW)} top · {fmt.int(vol)} kg vol
          </div>
        </div>
        <span style={{ color: "var(--color-text-3)", fontSize: 18 }}>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div style={{ paddingLeft: 12, borderLeft: "2px solid var(--color-border)" }}>
          {sets.map((s, i) => <SetRow key={i} set={s} />)}
        </div>
      )}
    </div>
  );
}

function DeleteConfirm({ onConfirm, onCancel, loading }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 4 }}>
      <p style={{ fontSize: 14, color: "var(--color-text-2)", margin: 0 }}>
        Delete this workout and all its sets? This cannot be undone.
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn-danger" onClick={onConfirm} disabled={loading}
          style={{ flex: 1, padding: "10px 16px", borderRadius: 12, fontSize: 13 }}>
          {loading ? "Deleting…" : "Yes, delete"}
        </button>
        <button className="btn-ghost" onClick={onCancel} style={{ flex: 1 }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function WorkoutDetail({ id, onBack, onDeleted }) {
  const { workout, loading } = useWorkoutDetail(id);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [coachNotes, setCoachNotes] = useState([]);
  const toast = useToast();

  useEffect(() => {
    if (id) {
      api.getSessionNotes(id)
        .then(res => setCoachNotes(res || []))
        .catch(e => console.error(e));
    }
  }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteWorkout(id);
      onDeleted();
    } catch (e) {
      toast.error("Delete failed: " + e.message);
      setDeleting(false);
      setShowConfirm(false);
    }
  };

  if (loading) return <Spinner />;
  if (!workout) return <div style={{ textAlign: "center", padding: 40, color: "var(--color-text-3)" }}>Not found</div>;

  const byEx = {};
  for (const s of workout.sets || []) {
    const n = s.exercise_name || "Unknown";
    if (!byEx[n]) byEx[n] = [];
    byEx[n].push(s);
  }

  return (
    <div style={{ paddingBottom: 100 }}>
      <Header
        title={workout.workout_name}
        subtitle={fmt.date(workout.session_date)}
        right={
          <button className="btn-ghost" onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <BackIcon size={14} /> Back
          </button>
        }
      />
      <div className="page-inner" style={{ display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Summary */}
        <div className="glass p-5">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
            <div>
              <div className="stat-value">{fmt.int(workout.total_volume)}</div>
              <div className="stat-label">kg volume</div>
            </div>
            <div>
              <div className="stat-value">{workout.total_sets}</div>
              <div className="stat-label">sets</div>
            </div>
            <div>
              <div className="stat-value">{workout.duration_sec > 0 ? fmt.duration(workout.duration_sec) : "—"}</div>
              <div className="stat-label">duration</div>
            </div>
          </div>
        </div>

        {/* Exercises */}
        <div className="glass p-5">
          <div className="section-label" style={{ marginBottom: 12 }}>Exercises</div>
          {Object.entries(byEx).map(([name, sets]) => (
            <ExerciseBlock key={name} name={name} sets={sets} />
          ))}
        </div>

        {workout.notes && (
          <div className="glass p-5">
            <div className="section-label" style={{ marginBottom: 6 }}>Notes</div>
            <p style={{ fontSize: 13, color: "var(--color-text-2)", margin: 0 }}>{workout.notes}</p>
          </div>
        )}

        {coachNotes && coachNotes.length > 0 && (
          <div className="glass p-5">
            <div className="section-label" style={{ marginBottom: 6, color: "var(--aura-accent)" }}>Coach Feedback</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {coachNotes.map(n => (
                <div key={n.id} style={{ background: "rgba(255,255,255,0.02)", borderRadius: 10, padding: 10, border: "1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--color-text-3)", fontWeight: 700, marginBottom: 4 }}>
                    <span>{n.coach_name || "Coach"}</span>
                    <span>{new Date(n.created_at).toLocaleDateString()}</span>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--color-text-2)", margin: 0, lineHeight: 1.4 }}>{n.note}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Delete */}
        <div className="glass p-5" style={{ borderColor: "color-mix(in srgb,var(--aura-accent3) 25%,transparent)" }}>
          {showConfirm ? (
            <DeleteConfirm onConfirm={handleDelete} onCancel={() => setShowConfirm(false)} loading={deleting} />
          ) : (
            <button
              className="btn-danger"
              onClick={() => setShowConfirm(true)}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%", justifyContent: "center",
                padding: "10px 16px", borderRadius: 12, fontSize: 13
              }}>
              <TrashIcon size={14} /> Delete Workout
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Workouts() {
  const { workouts, loading, error, reload } = useWorkouts();
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");

  const handleDeleted = () => { setSelected(null); reload(); };

  if (selected) {
    return <WorkoutDetail id={selected} onBack={() => setSelected(null)} onDeleted={handleDeleted} />;
  }

  const filtered = workouts.filter(w =>
    !search || w.workout_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 100 }}>
      <Header title="Workouts" subtitle={`${workouts.length} sessions logged`} />
      <div className="page-inner" style={{ display: "flex", flexDirection: "column", gap: 12 }}>

        <div style={{ position: "relative" }}>
          <div style={{
            position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
            color: "var(--color-text-3)"
          }}>
            <SearchIcon size={15} />
          </div>
          <input
            className="input-base"
            style={{ paddingLeft: 36 }}
            placeholder="Search workouts…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading && <Spinner />}
        {error && (
          <div style={{
            padding: 16, borderRadius: 14, background: "color-mix(in srgb,var(--aura-accent3) 10%,transparent)",
            color: "var(--aura-accent3)", fontSize: 13
          }}>
            {error}
          </div>
        )}

        {filtered.map(w => (
          <WorkoutCard key={w.id} workout={w} onClick={() => setSelected(w.id)} />
        ))}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 48, color: "var(--color-text-3)", fontSize: 14 }}>
            No workouts found
          </div>
        )}
      </div>
    </div>
  );
}
