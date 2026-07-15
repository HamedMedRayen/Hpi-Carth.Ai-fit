import React, { useState } from "react";
import { api } from "../utils/api";

const BODY_PARTS = ["Arms", "Chest", "Back", "Legs", "Shoulders", "Abs", "Calves", "Cardio", "Other"];
const MUSCLE_OPTIONS = [
  "Biceps", "Triceps", "Brachialis", "Forearms",
  "Chest", "Serratus anterior",
  "Lats", "Trapezius", "Lower back", "Rhomboids",
  "Abs", "Obliques",
  "Quads", "Hamstrings", "Glutes", "Adductors",
  "Calves", "Soleus",
  "Shoulders", "Traps"
];

export default function CustomExerciseModal({ bodyPart, onClose, onCreated }) {
  const [name, setName]           = useState("");
  const [selectedBP, setSelectedBP] = useState(bodyPart || "");
  const [muscles, setMuscles]     = useState([]);
  const [muscleInput, setMuscleInput] = useState("");
  const [equipment, setEquipment] = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);

  const toggleMuscle = (muscle) => {
    setMuscles(prev =>
      prev.includes(muscle) ? prev.filter(m => m !== muscle) : [...prev, muscle]
    );
  };

  const handleAddMuscle = () => {
    if (muscleInput.trim() && !muscles.includes(muscleInput.trim())) {
      setMuscles(prev => [...prev, muscleInput.trim()]);
      setMuscleInput("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Exercise name is required");
      return;
    }
    if (!selectedBP) {
      setError("Body part is required");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const newExercise = await api.createCustomExercise({
        name: name.trim(),
        body_part: selectedBP,
        primary_muscles: muscles,
        equipment: equipment.trim()
      });
      onCreated(newExercise);
    } catch (err) {
      setError(err.message || "Failed to create custom exercise");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", 
      display:"flex", alignItems:"center", justifyContent:"center", zIndex:1001 }}>
      <div style={{ background:"var(--color-bg)", borderRadius:16, padding:24, 
        width:"90%", maxWidth:450, maxHeight:"90vh", overflow:"auto" }}>
        
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", 
          marginBottom:20 }}>
          <h2 style={{ fontSize:18, fontWeight:600, margin:0, color:"var(--color-text)" }}>
            Create Custom Exercise
          </h2>
          <button onClick={onClose} style={{ background:"none", border:"none", 
            fontSize:20, cursor:"pointer", color:"var(--color-text-3)" }}>
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {/* Name */}
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:"var(--color-text-3)", 
              display:"block", marginBottom:6 }}>
              Exercise Name *
            </label>
            <input
              className="input-base"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Kettlebell Swing"
              disabled={loading}
            />
          </div>

          {/* Body Part */}
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:"var(--color-text-3)", 
              display:"block", marginBottom:6 }}>
              Body Part *
            </label>
            <select
              className="input-base"
              value={selectedBP}
              onChange={e => setSelectedBP(e.target.value)}
              disabled={loading}
              style={{ cursor:"pointer" }}
            >
              <option value="">Select a body part…</option>
              {BODY_PARTS.map(bp => (
                <option key={bp} value={bp}>{bp}</option>
              ))}
            </select>
          </div>

          {/* Primary Muscles */}
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:"var(--color-text-3)", 
              display:"block", marginBottom:8 }}>
              Primary Muscles (Tags)
            </label>
            
            {/* Quick select buttons */}
            <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10 }}>
              {MUSCLE_OPTIONS.map(muscle => (
                <button
                  key={muscle}
                  type="button"
                  onClick={() => toggleMuscle(muscle)}
                  disabled={loading}
                  style={{
                    padding:"6px 12px",
                    borderRadius:16,
                    border:"1px solid var(--color-border)",
                    background:muscles.includes(muscle) ? "var(--aura-accent)" : "transparent",
                    color:muscles.includes(muscle) ? "var(--color-bg)" : "var(--color-text)",
                    cursor:"pointer",
                    fontSize:12,
                    fontWeight:500,
                    transition:"all 0.2s"
                  }}
                >
                  {muscle}
                </button>
              ))}
            </div>

            {/* Selected muscles display */}
            {muscles.length > 0 && (
              <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10 }}>
                {muscles.map(muscle => (
                  <span key={muscle} style={{
                    display:"inline-flex",
                    alignItems:"center",
                    gap:6,
                    padding:"4px 10px",
                    borderRadius:12,
                    background:"color-mix(in srgb,var(--aura-accent) 20%,transparent)",
                    color:"var(--color-text)",
                    fontSize:12
                  }}>
                    {muscle}
                    <button
                      type="button"
                      onClick={() => setMuscles(prev => prev.filter(m => m !== muscle))}
                      disabled={loading}
                      style={{
                        background:"none",
                        border:"none",
                        color:"var(--color-text-3)",
                        cursor:"pointer",
                        fontSize:16,
                        padding:0,
                        lineHeight:1
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Custom input */}
            <div style={{ display:"flex", gap:6 }}>
              <input
                type="text"
                className="input-base"
                value={muscleInput}
                onChange={e => setMuscleInput(e.target.value)}
                onKeyPress={e => { if (e.key === "Enter") { e.preventDefault(); handleAddMuscle(); } }}
                placeholder="Type to add custom muscle…"
                disabled={loading}
                style={{ flex:1 }}
              />
              <button
                type="button"
                onClick={handleAddMuscle}
                disabled={loading || !muscleInput.trim()}
                style={{
                  padding:"8px 12px",
                  borderRadius:8,
                  border:"1px solid var(--color-border)",
                  background:"var(--color-bg-hover)",
                  color:"var(--color-text)",
                  cursor:"pointer",
                  fontSize:12,
                  fontWeight:500,
                  transition:"all 0.2s"
                }}
              >
                Add
              </button>
            </div>
          </div>

          {/* Equipment */}
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:"var(--color-text-3)", 
              display:"block", marginBottom:6 }}>
              Equipment (Optional)
            </label>
            <input
              className="input-base"
              type="text"
              value={equipment}
              onChange={e => setEquipment(e.target.value)}
              placeholder="e.g., Kettlebell, Dumbbell"
              disabled={loading}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{ padding:10, borderRadius:8, background:"color-mix(in srgb,#f43f5e 20%,transparent)",
              color:"#f43f5e", fontSize:13 }}>
              {error}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display:"flex", gap:10, marginTop:8 }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex:1,
                padding:"10px",
                borderRadius:10,
                border:"none",
                background:"var(--aura-accent)",
                color:"var(--color-bg)",
                cursor:"pointer",
                fontWeight:600,
                fontSize:13,
                opacity:loading ? 0.6 : 1,
                transition:"all 0.2s"
              }}
            >
              {loading ? "Creating…" : "Create Exercise"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                flex:0.5,
                padding:"10px",
                borderRadius:10,
                border:"1px solid var(--color-border)",
                background:"transparent",
                color:"var(--color-text)",
                cursor:"pointer",
                fontWeight:500,
                fontSize:13
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
