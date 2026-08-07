import React, { useState, useEffect } from "react";
import {
  ChevronDown, Timer, Scale, StickyNote, Pencil, Check, X,
} from "lucide-react";
import { API_BASE_URL as API, resolveBackendUrl } from "../../utils/config";
import { getSyncItem, setItem } from "../../utils/storage";

const REST_OPTIONS = ["Off", "30s", "1m", "1m30", "2m", "2m30", "3m", "4m", "5m"];

function getRecommendation(category = "") {
  const cat = category.toLowerCase();
  if (["chest", "back", "legs", "lower legs", "upper legs"].some(c => cat.includes(c)))
    return "3–4 sets of 5–8 reps (strength focus)";
  if (["arms", "upper arms", "lower arms", "shoulders"].some(c => cat.includes(c)))
    return "3 sets of 10–15 reps (hypertrophy focus)";
  if (["waist", "core"].some(c => cat.includes(c)))
    return "3 sets of 15–20 reps";
  if (cat.includes("cardio"))
    return "20–40 min steady state or intervals";
  return "3 sets of 8–12 reps";
}

function token() { return getSyncItem("aura_token"); }

// ── Sticky Note sub-component ──────────────────────────────────────────────
function StickyNotePanel({ exercise }) {
  const [note, setNote] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!exercise?.id) return;
    fetch(`${API}/exercise-notes/${exercise.id}`, {
      headers: { Authorization: `Bearer ${token()}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { setNote(data); })
      .catch(() => { });
  }, [exercise?.id]);

  const saveNote = async () => {
    if (!draft.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/exercise-notes/${exercise.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ note: draft.trim() }),
      });
      if (res.ok) {
        setNote({ note: draft.trim() });
        setEditMode(false);
      }
    } finally { setLoading(false); }
  };

  const deleteNote = async () => {
    await fetch(`${API}/exercise-notes/${exercise.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token()}` },
    });
    setNote(null);
    setEditMode(false);
    setDraft("");
  };

  if (editMode) {
    return (
      <div style={{
        background: "rgba(255,210,0,0.08)", border: "1px solid rgba(255,210,0,0.25)",
        borderRadius: 10, padding: "10px 12px", margin: "12px 16px",
      }}>
        <textarea
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Add a note about this exercise…"
          rows={3}
          style={{
            width: "100%", background: "transparent", border: "none", outline: "none",
            resize: "vertical", fontSize: 13, color: "var(--text-primary)", lineHeight: 1.5,
          }}
        />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
          <button onClick={() => { setEditMode(false); setDraft(note?.note || ""); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4 }}>
            <X size={15} />
          </button>
          <button onClick={saveNote} disabled={loading}
            style={{
              background: "rgba(255,210,0,0.2)", border: "1px solid rgba(255,210,0,0.4)", borderRadius: 6,
              cursor: "pointer", color: "#FFD200", padding: "4px 10px", fontSize: 12, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 4
            }}>
            <Check size={13} /> Save
          </button>
        </div>
      </div>
    );
  }

  if (note?.note) {
    return (
      <div style={{
        background: "rgba(255,210,0,0.08)", border: "1px solid rgba(255,210,0,0.25)",
        borderRadius: 10, padding: "10px 12px", margin: "12px 16px",
        display: "flex", alignItems: "flex-start", gap: 8,
      }}>
        <StickyNote size={14} color="#FFD200" style={{ flexShrink: 0, marginTop: 2 }} />
        <span style={{ flex: 1, fontSize: 13, color: "var(--text-primary)", lineHeight: 1.5 }}>{note.note}</span>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button onClick={() => { setDraft(note.note); setEditMode(true); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 2 }}>
            <Pencil size={13} />
          </button>
          <button onClick={deleteNote}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 2 }}>
            <X size={13} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => { setDraft(""); setEditMode(true); }}
      style={{
        display: "flex", alignItems: "center", gap: 6, margin: "12px 16px",
        background: "none", border: "1px dashed rgba(255,210,0,0.30)", borderRadius: 8,
        padding: "8px 12px", cursor: "pointer", color: "#FFD200", fontSize: 12, opacity: 0.7,
      }}
    >
      <StickyNote size={13} /> Add note
    </button>
  );
}

// ── Main ExerciseDetailSheet ───────────────────────────────────────────────
export default function ExerciseDetailSheet({ exercise, onClose, onUnitChange, onRestTimerChange }) {
  const lsRestKey = `rest_timer_${exercise?.id}`;
  const lsUnitKey = `weight_unit_${exercise?.id}`;

  const [restTimer, setRestTimer] = useState(() => getSyncItem(lsRestKey) || "1m30");
  const [weightUnit, setWeightUnit] = useState(() => exercise?.unit || getSyncItem(lsUnitKey) || "kg");
  const [showRestPicker, setShowRestPicker] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const stepsRaw = exercise?.instruction_steps;
  let parsedSteps = [];
  try { parsedSteps = typeof stepsRaw === "string" ? JSON.parse(stepsRaw) : stepsRaw || []; } catch (e) { }
  const steps = Array.isArray(parsedSteps) ? parsedSteps : [];
  const visibleSteps = expanded ? steps : steps.slice(0, 2);

  const isCardio = (exercise?.category || exercise?.body_part || "").toLowerCase().includes("cardio");

  function setRest(val) {
    setRestTimer(val);
    setItem(lsRestKey, val);
    onRestTimerChange?.(val);
    setShowRestPicker(false);
  }

  function toggleUnit() {
    const next = weightUnit === "kg" ? "lb" : "kg";
    setWeightUnit(next);
    setItem(lsUnitKey, next);
    if (onUnitChange && exercise?.blockIdx !== undefined) {
      onUnitChange(exercise.blockIdx, next);
    }
  }

  const rec = getRecommendation(exercise?.category || exercise?.body_part_name || "");

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, backdropFilter: "blur(2px)" }}
      />

      {/* Sheet */}
      <div style={{
        position: "fixed",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 340, maxHeight: 520,
        background: "var(--bg-secondary)", borderRadius: 16,
        zIndex: 201, overflowY: "auto",
        border: "1.5px solid var(--border-card)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
      }}>
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border-card)" }} />
        </div>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "8px 16px 12px", borderBottom: "0.5px solid var(--color-border)",
        }}>
          <button onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4 }}>
            <ChevronDown size={22} />
          </button>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)", flex: 1 }}>
            {exercise?.name || "Exercise Detail"}
          </h2>
        </div>

        {/* GIF / Image */}
        {(exercise?.gif_url || exercise?.image_url) && (
          <div style={{
            width: "100%",
            height: 200,
            background: "var(--bg-input)",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderBottom: "1px solid var(--border-card)",
          }}>
            <img
              src={resolveBackendUrl(exercise.gif_url || exercise.image_url)}
              alt={exercise.name}
              style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
              onError={e => { e.target.parentElement.style.display = "none"; }}
            />
          </div>
        )}

        {/* Recommendation bar */}
        <div style={{
          margin: "14px 16px 0",
          background: "rgba(var(--aura-accent-rgb), 0.10)",
          borderLeft: "3px solid var(--aura-accent2)",
          borderRadius: "0 8px 8px 0",
          padding: "10px 14px",
          fontSize: 13, color: "var(--color-text-2)",
        }}>
          {rec}
        </div>

        {/* Sticky note */}
        {exercise?.id && <StickyNotePanel exercise={exercise} />}

        {/* Instructions */}
        {steps.length > 0 && (
          <div style={{ padding: "14px 16px 0" }}>
            <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
              Instructions
            </h3>
            <ol style={{ margin: 0, paddingLeft: 18 }}>
              {visibleSteps.map((step, i) => (
                <li key={i} style={{ fontSize: 13, color: "var(--color-text-2)", marginBottom: 8, lineHeight: 1.5 }}>
                  {step}
                </li>
              ))}
            </ol>
            {steps.length > 2 && (
              <button
                onClick={() => setExpanded(e => !e)}
                style={{
                  display: "flex", alignItems: "center", gap: 4, background: "none", border: "none",
                  cursor: "pointer", color: "var(--aura-accent)", fontSize: 12, fontWeight: 600,
                  padding: "4px 0", marginTop: 4,
                }}>
                <ChevronDown size={14} style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "0.2s" }} />
                {expanded ? "LESS" : `MORE (${steps.length - 2} more steps)`}
              </button>
            )}
          </div>
        )}

        {/* Body part + Category */}
        <div style={{ margin: "14px 16px 0", borderRadius: 10, border: "1px solid var(--border-card)", overflow: "hidden" }}>
          {[
            { label: "Body part", value: exercise?.body_part_name || exercise?.body_part || "—" },
            { label: "Category", value: exercise?.category || "—" },
          ].map(({ label, value }, i) => (
            <div key={label} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "12px 14px",
              borderTop: i > 0 ? "0.5px solid var(--border-card)" : "none",
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{label}</span>
              <span style={{ fontSize: 13, color: "var(--color-text-2)", textTransform: "capitalize" }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Preferences */}
        {!isCardio && (
          <div style={{ padding: "14px 16px 0" }}>
            <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
              Preferences
            </h3>
            <div style={{ borderRadius: 10, border: "1px solid var(--border-card)", overflow: "hidden" }}>

              {/* Rest timer */}
              <div>
                <button
                  onClick={() => setShowRestPicker(v => !v)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "13px 14px",
                    background: "none", border: "none", cursor: "pointer", borderBottom: "0.5px solid var(--border-card)",
                  }}>
                  <Timer size={16} color="var(--aura-accent)" />
                  <span style={{ flex: 1, fontSize: 13, color: "var(--text-primary)", textAlign: "left", fontWeight: 500 }}>
                    Rest Timer
                  </span>
                  <span style={{ fontSize: 13, color: "var(--aura-accent)", fontWeight: 600 }}>{restTimer}</span>
                </button>
                {showRestPicker && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "10px 14px", background: "var(--bg-input)" }}>
                    {REST_OPTIONS.map(opt => (
                      <button key={opt} onClick={() => setRest(opt)} style={{
                        padding: "6px 12px", borderRadius: 8,
                        border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                        background: restTimer === opt ? "var(--aura-accent)" : "var(--bg-card)",
                        color: restTimer === opt ? "#fff" : "var(--text-muted)",
                        transition: "all 0.15s",
                      }}>{opt}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Weight unit */}
              <button
                onClick={toggleUnit}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "13px 14px",
                  background: "none", border: "none", cursor: "pointer",
                }}>
                <Scale size={16} color="var(--aura-accent)" />
                <span style={{ flex: 1, fontSize: 13, color: "var(--text-primary)", textAlign: "left", fontWeight: 500 }}>
                  Weight unit
                </span>
                <span style={{ fontSize: 13, color: "var(--aura-accent)", fontWeight: 600 }}>{weightUnit}</span>
              </button>
            </div>
          </div>
        )}

        {/* Done button */}
        <div style={{ padding: "20px 16px 0" }}>
          <button
            onClick={onClose}
            style={{
              width: "100%", background: "var(--aura-accent)", color: "var(--color-on-accent)",
              border: "none", borderRadius: 12, padding: 14,
              fontSize: 15, fontWeight: 700, cursor: "pointer",
              transition: "opacity 0.2s", minHeight: 48,
            }}
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
}
