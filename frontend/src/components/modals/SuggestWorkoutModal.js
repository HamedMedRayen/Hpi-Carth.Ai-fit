import React, { useState } from "react";
import { X, Search, Dumbbell, Plus, Trash2, ArrowRight, LayoutList } from "lucide-react";
import { api } from "../../utils/api";
import ExercisePicker from "./../widgets/ExercisePicker";
import { useToast } from "./../common/Toast";

export default function SuggestWorkoutModal({ athlete, onClose, onSuggest }) {
  const [programName, setProgramName] = useState("");
  const [programNote, setProgramNote] = useState("");
  const [workouts, setWorkouts] = useState([{ name: "Day 1", exercises: [] }]);
  const [activeWorkoutIndex, setActiveWorkoutIndex] = useState(0);
  
  const [showNote, setShowNote] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const activeWorkout = workouts[activeWorkoutIndex];

  const addWorkout = () => {
    const newWorkout = { name: `Day ${workouts.length + 1}`, exercises: [] };
    setWorkouts([...workouts, newWorkout]);
    setActiveWorkoutIndex(workouts.length);
  };

  const updateWorkoutName = (name) => {
    const newWorkouts = [...workouts];
    newWorkouts[activeWorkoutIndex].name = name;
    setWorkouts(newWorkouts);
  };

  const removeWorkout = (index) => {
    if (workouts.length === 1) return; // Must have at least 1
    const newWorkouts = workouts.filter((_, i) => i !== index);
    setWorkouts(newWorkouts);
    if (activeWorkoutIndex >= index && activeWorkoutIndex > 0) {
      setActiveWorkoutIndex(activeWorkoutIndex - 1);
    }
  };

  const addExercise = (ex) => {
    const newWorkouts = [...workouts];
    newWorkouts[activeWorkoutIndex].exercises.push({ 
      id: ex.id, 
      exercise_name: ex.name, 
      sets: [
        { reps: "", weight_kg: "" }
      ]
    });
    setWorkouts(newWorkouts);
    setPickerOpen(false);
  };

  const removeExercise = (exIndex) => {
    const newWorkouts = [...workouts];
    newWorkouts[activeWorkoutIndex].exercises = newWorkouts[activeWorkoutIndex].exercises.filter((_, i) => i !== exIndex);
    setWorkouts(newWorkouts);
  };

  const addSetToExercise = (exIndex) => {
    const newWorkouts = [...workouts];
    newWorkouts[activeWorkoutIndex].exercises[exIndex].sets.push({ reps: "", weight_kg: "" });
    setWorkouts(newWorkouts);
  };

  const removeSetFromExercise = (exIndex, setIndex) => {
    const newWorkouts = [...workouts];
    newWorkouts[activeWorkoutIndex].exercises[exIndex].sets = newWorkouts[activeWorkoutIndex].exercises[exIndex].sets.filter((_, i) => i !== setIndex);
    setWorkouts(newWorkouts);
  };

  const updateSet = (exIndex, setIndex, field, value) => {
    const newWorkouts = [...workouts];
    newWorkouts[activeWorkoutIndex].exercises[exIndex].sets[setIndex][field] = value;
    setWorkouts(newWorkouts);
  };

  const handleSubmit = async () => {
    if (!programName.trim() || workouts.length === 0) return;
    
    // Validate that all workouts have a name and at least one exercise
    const isValid = workouts.every(w => w.name.trim() && w.exercises.length > 0);
    if (!isValid) {
      toast.error("Please ensure every workout day has a name and at least one exercise.");
      return;
    }

    setLoading(true);
    try {
      await api.suggestWorkout(athlete.athlete_id, {
        program_name: programName,
        program_note: programNote,
        workouts: workouts
      });
      onSuggest();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
      padding: 20
    }}>
      <div style={{
        background: "var(--bg-glass)", border: "1px solid var(--border-card)",
        borderRadius: 24, width: "100%", maxWidth: 800,
        boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
        display: "flex", flexDirection: "column", maxHeight: "90vh"
      }}>
        {/* Modal Header */}
        <div style={{ padding: 24, borderBottom: "1px solid var(--border-card)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: "var(--color-text)" }}>Suggest Training Program</h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-3)" }}>For {athlete.name}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--color-text)", cursor: "pointer", padding: 8 }}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          
          {/* Left Sidebar - Workouts List */}
          <div style={{ 
            width: 240, borderRight: "1px solid var(--border-card)", 
            display: "flex", flexDirection: "column", background: "rgba(255,255,255,0.01)" 
          }}>
            <div style={{ padding: 16, borderBottom: "1px solid var(--border-card)" }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "var(--color-text-3)", marginBottom: 8, letterSpacing: "0.05em" }}>PROGRAM NAME</label>
              <input 
                className="themed-input"
                value={programName}
                onChange={e => setProgramName(e.target.value)}
                placeholder="e.g. Hypertrophy P1"
                style={{ width: "100%", fontSize: 13, padding: "8px 12px" }}
              />
            </div>

            {showNote ? (
              <div style={{ padding: 16, borderBottom: "1px solid var(--border-card)", background: "rgba(245, 158, 11, 0.05)", position: "relative" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 800, color: "#F59E0B", marginBottom: 8, letterSpacing: "0.05em" }}>
                  STICKY NOTE
                </label>
                <button 
                  onClick={() => { setShowNote(false); setProgramNote(""); }}
                  title="Remove note"
                  style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", color: "#F59E0B", cursor: "pointer", opacity: 0.7 }}
                >
                  <Trash2 size={14} />
                </button>
                <textarea 
                  className="themed-input"
                  value={programNote}
                  onChange={e => setProgramNote(e.target.value)}
                  placeholder="Leave a message or instructions..."
                  style={{ 
                    width: "100%", fontSize: 12, padding: "8px 12px", minHeight: 70, 
                    resize: "vertical", borderColor: "rgba(245, 158, 11, 0.2)", 
                    background: "rgba(0,0,0,0.2)"
                  }}
                />
              </div>
            ) : (
              <div style={{ padding: 16, borderBottom: "1px solid var(--border-card)" }}>
                <button 
                  onClick={() => setShowNote(true)}
                  style={{ width: "100%", padding: "8px", borderRadius: 8, border: "1px dashed rgba(245, 158, 11, 0.4)", background: "rgba(245, 158, 11, 0.05)", color: "#F59E0B", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", fontSize: 11, fontWeight: 800, letterSpacing: "0.05em", transition: "all 0.2s" }}
                >
                  <Plus size={14} /> ADD STICKY NOTE
                </button>
              </div>
            )}
            
            <div style={{ padding: "16px 16px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "var(--color-text-3)", letterSpacing: "0.05em" }}>WORKOUT DAYS</span>
              <button 
                onClick={addWorkout}
                style={{ background: "none", border: "none", color: "var(--aura-accent)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700 }}
              >
                <Plus size={12} /> ADD
              </button>
            </div>
            
            <div style={{ overflowY: "auto", flex: 1, padding: "0 12px 16px" }}>
              {workouts.map((w, idx) => (
                <div 
                  key={idx}
                  onClick={() => setActiveWorkoutIndex(idx)}
                  style={{
                    padding: "10px 12px", borderRadius: 12, marginBottom: 8, cursor: "pointer",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    background: activeWorkoutIndex === idx ? "rgba(var(--aura-accent-rgb), 0.1)" : "transparent",
                    border: `1px solid ${activeWorkoutIndex === idx ? "var(--aura-accent)" : "transparent"}`,
                    transition: "all 0.2s"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <LayoutList size={14} color={activeWorkoutIndex === idx ? "var(--aura-accent)" : "var(--color-text-3)"} />
                    <span style={{ fontSize: 13, fontWeight: activeWorkoutIndex === idx ? 700 : 500, color: activeWorkoutIndex === idx ? "var(--color-text)" : "var(--color-text-3)" }}>
                      {w.name || `Day ${idx + 1}`}
                    </span>
                  </div>
                  {workouts.length > 1 && activeWorkoutIndex === idx && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeWorkout(idx); }}
                      style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", padding: 2 }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right Area - Active Workout Details */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 24, overflowY: "auto" }}>
            <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "var(--color-text-3)", marginBottom: 8, letterSpacing: "0.05em" }}>WORKOUT NAME</label>
                <input 
                  className="themed-input"
                  value={activeWorkout.name}
                  onChange={e => updateWorkoutName(e.target.value)}
                  placeholder="e.g. Pull Day"
                  style={{ width: "100%", fontSize: 16 }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "var(--color-text-3)", marginBottom: 8, letterSpacing: "0.05em" }}>ADD EXERCISES</label>
              <button 
                onClick={() => setPickerOpen(true)}
                style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "1px dashed var(--border-card)", background: "rgba(255,255,255,0.02)", color: "var(--color-text-3)", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, fontWeight: 500, transition: "all 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "var(--aura-accent)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border-card)"}
              >
                <Search size={18} /> Search exercises to add to this day...
              </button>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "var(--color-text-3)", marginBottom: 12, letterSpacing: "0.05em" }}>EXERCISES ({activeWorkout.exercises.length})</label>
              {activeWorkout.exercises.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-3)", background: "rgba(255,255,255,0.02)", borderRadius: 16, border: "1px dashed var(--border-card)" }}>
                  No exercises added to this day yet.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {activeWorkout.exercises.map((ex, idx) => (
                    <div key={idx} style={{
                      background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-card)",
                      borderRadius: 12, padding: 16, display: "flex", alignItems: "center", gap: 16
                    }}>
                      <div style={{ 
                        width: 24, height: 24, borderRadius: "50%", background: "rgba(var(--aura-accent-rgb), 0.1)",
                        color: "var(--aura-accent)", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: 800, flexShrink: 0
                      }}>
                        {idx + 1}
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                          {ex.exercise_name}
                          <button 
                            onClick={() => removeExercise(idx)}
                            style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", opacity: 0.7 }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {ex.sets.map((s, si) => (
                            <div key={si} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-3)", width: 24 }}>S{si + 1}</div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: 10, color: "var(--color-text-3)", fontWeight: 800 }}>REPS</span>
                                <input 
                                  type="number" value={s.reps} 
                                  onChange={e => updateSet(idx, si, 'reps', e.target.value)}
                                  placeholder="e.g. 10"
                                  style={{ width: 50, background: "var(--bg-input)", border: "1px solid var(--border-input)", borderRadius: 6, padding: "4px 8px", color: "white", fontSize: 12, textAlign: "center" }}
                                />
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: 10, color: "var(--color-text-3)", fontWeight: 800 }}>LBS/KG</span>
                                <input 
                                  type="number" value={s.weight_kg} 
                                  onChange={e => updateSet(idx, si, 'weight_kg', e.target.value)}
                                  placeholder="opt."
                                  style={{ width: 60, background: "var(--bg-input)", border: "1px solid var(--border-input)", borderRadius: 6, padding: "4px 8px", color: "white", fontSize: 12, textAlign: "center" }}
                                />
                              </div>
                              {ex.sets.length > 1 && (
                                <button 
                                  onClick={() => removeSetFromExercise(idx, si)}
                                  style={{ background: "none", border: "none", color: "var(--color-text-3)", cursor: "pointer", display: "flex" }}
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        <button 
                          onClick={() => addSetToExercise(idx)}
                          style={{ background: "none", border: "none", color: "var(--aura-accent)", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, marginTop: 12, padding: 0 }}
                        >
                          <Plus size={12} /> ADD SET
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Modal Footer */}
        <div style={{ padding: 24, borderTop: "1px solid var(--border-card)", display: "flex", justifyContent: "flex-end", gap: 12, background: "rgba(255,255,255,0.01)" }}>
          <button 
            onClick={onClose}
            style={{ padding: "12px 24px", borderRadius: 12, background: "transparent", border: "1px solid var(--border-card)", color: "var(--color-text)", fontWeight: 700, cursor: "pointer" }}
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={!programName.trim() || workouts.length === 0 || loading}
            className="btn-primary"
            style={{ padding: "12px 24px", borderRadius: 12, display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}
          >
            {loading ? "Sending..." : "Send Program to Athlete"} <ArrowRight size={16} />
          </button>
        </div>
      </div>
      
      {pickerOpen && (
        <ExercisePicker 
          onSelect={addExercise}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
