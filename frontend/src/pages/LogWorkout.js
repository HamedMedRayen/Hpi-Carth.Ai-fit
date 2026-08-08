import React, { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "react-router-dom";
import { useTheme } from "../utils/theme";

import Header from "../components/layout/Header";
import ExercisePicker from "../components/widgets/ExercisePicker";
import TemplateModal from "../components/modals/TemplateModal";
import PlanPickerModal from "../components/modals/PlanPickerModal";
import ProgressiveOverloadSuggestion from "../components/widgets/ProgressiveOverloadSuggestion";
import { api } from "../utils/api";
import { fmt } from "../utils/formatters";
import { Trophy, ClipboardList, CheckCircle, TrendingUp, FolderOpen, Save, Link2, X, Heart, ChevronRight, Info, Trash2, Plus } from "lucide-react";
import ExerciseDetailSheet from "../components/widgets/ExerciseDetailSheet";
import { getSyncItem, setItem } from "../utils/storage";
import { API_BASE_URL } from "../utils/config";

function today() { return new Date().toISOString().slice(0, 16); }
function epley1rm(w, r) { return w && r ? +(w * (1 + r / 30)).toFixed(1) : 0; }

function getExerciseType(exercise) {
  const cat = (exercise?.category || exercise?.body_part || "").toLowerCase();
  if (["cardio"].includes(cat)) return "cardio";
  if (["body weight", "bodyweight"].includes(exercise?.equipment?.toLowerCase())) return "bodyweight";
  return "weighted";
}

const TYPES = ["Push", "Pull", "Legs", "Upper", "Lower", "Full Body", "Custom"];

function NumberInput({ value, onChange, placeholder, min = 0, step = 1 }) {
  return (
    <input type="number" inputMode="decimal" min={min} step={step}
      value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} className="input-base"
      style={{ textAlign: "center" }} />
  );
}

function RestTimerDivider({ restTime, onChange }) {
  const [editing, setEditing] = useState(false);
  const [custom, setCustom] = useState("");
  const editRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (editRef.current && !editRef.current.contains(e.target)) setEditing(false);
    };
    const handleEscape = (e) => {
      if (e.key === "Escape") setEditing(false);
    };
    if (editing) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [editing]);

  if (!restTime && !editing) {
    return (
      <div
        onClick={() => setEditing(true)}
        style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 0", opacity: 0.3, cursor: "pointer" }}
        onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
        onMouseLeave={e => e.currentTarget.style.opacity = "0.3"}
      >
        <hr style={{ flex: 1, border: "none", borderTop: "1px solid var(--border-card)" }} />
        <span style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>+ add timer</span>
        <hr style={{ flex: 1, border: "none", borderTop: "1px solid var(--border-card)" }} />
      </div>
    );
  }

  if (!editing) {
    return (
      <div onClick={() => setEditing(true)} style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 0" }}>
        <hr style={{ flex: 1, border: "none", borderTop: "1px solid var(--border-card)" }} />
        <span style={{ color: "var(--accent-primary)", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "0 12px", whiteSpace: "nowrap" }}>
          {restTime}
        </span>
        <hr style={{ flex: 1, border: "none", borderTop: "1px solid var(--border-card)" }} />
      </div>
    );
  }

  const options = ["Off", "30s", "1m", "1m30", "2m", "2m30", "3m", "4m", "5m"];

  return (
    <div ref={editRef} style={{ padding: "8px 0", display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 10 }}>
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => { onChange(opt === "Off" ? null : opt); setEditing(false); }}
          style={{
            padding: "4px 10px", borderRadius: 999, fontSize: 12, cursor: "pointer",
            border: "1px solid",
            borderColor: restTime === opt ? "transparent" : "var(--border-card)",
            background: restTime === opt ? "var(--accent-primary)" : "var(--bg-input)",
            color: restTime === opt ? "#000" : "var(--text-muted)",
          }}
        >
          {opt}
        </button>
      ))}
      <input
        type="text"
        placeholder="mm:ss"
        value={custom}
        onChange={e => setCustom(e.target.value)}
        onBlur={() => { if (custom) { onChange(custom); setEditing(false); } }}
        onKeyDown={e => { if (e.key === "Enter" && custom) { onChange(custom); setEditing(false); } }}
        style={{ width: 60, padding: "4px 8px", borderRadius: 999, fontSize: 12, border: "1px solid var(--border-card)", background: "var(--bg-input)", color: "var(--text-primary)", textAlign: "center" }}
      />
      <button
        onClick={() => { onChange(null); setEditing(false); }}
        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "4px" }}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

function SetRow({ set, idx, onChange, onRemove, exerciseName, prevSet, type, unit }) {
  const [completed, setCompleted] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const typeRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (typeRef.current && !typeRef.current.contains(e.target)) {
        setShowTypeSelector(false);
      }
    };
    if (showTypeSelector) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showTypeSelector]);

  const typeConfig = {
    normal: { label: idx + 1, bg: "var(--bg-input)", color: "var(--text-primary)" },
    warmup: { label: "W", bg: "rgba(156,163,175,0.3)", color: "#9CA3AF" },
    failure: { label: "F", bg: "rgba(239,68,68,0.2)", color: "#EF4444" },
    dropset: { label: "D", bg: "rgba(249,115,22,0.2)", color: "#F97316" }
  };

  const currentType = set.set_type || "normal";
  const typeObj = typeConfig[currentType] || typeConfig.normal;

  // Check if current weight/reps beat the previous (for weighted/bodyweight)
  const beatsPrevious = type !== 'cardio' && prevSet && (
    (+set.weight_kg > prevSet.weight_kg) ||
    (+set.weight_kg === prevSet.weight_kg && +set.reps > prevSet.reps)
  );

  let prevDisplay = "—";
  if (prevSet) {
    if (type === "cardio") {
      const km = prevSet.distance_m ? prevSet.distance_m / 1000 : 0;
      const m = Math.floor((prevSet.duration_s || 0) / 60);
      const s = (prevSet.duration_s || 0) % 60;
      prevDisplay = `${km}km · ${m}:${s.toString().padStart(2, '0')}`;
    } else {
      prevDisplay = `+${prevSet.weight_kg ?? 0}${unit} × ${prevSet.reps || 0}`;
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "12px 8px",
        borderBottom: "1.2px solid var(--color-border)", background: completed ? "rgba(16,185,129,0.08)" : "transparent",
        transition: "background 0.2s"
      }}>
        {/* SET column (clickable for type) */}
        <div style={{ width: 32, position: "relative" }} ref={typeRef}>
          <button
            onClick={() => setShowTypeSelector(!showTypeSelector)}
            style={{
              width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border-card)",
              background: currentType === "normal" ? "var(--bg-input)" : typeObj.bg,
              color: currentType === "normal" ? "var(--text-primary)" : typeObj.color,
              cursor: "pointer", fontSize: 13, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
              transition: "background 0.2s"
            }}
            onMouseEnter={e => e.currentTarget.style.background = currentType === "normal" ? "var(--bg-card-hover)" : typeObj.bg}
            onMouseLeave={e => e.currentTarget.style.background = currentType === "normal" ? "var(--bg-input)" : typeObj.bg}
          >
            {typeObj.label}
          </button>

          {showTypeSelector && (
            <div style={{
              position: "absolute", top: "100%", left: 0, marginTop: 4, zIndex: 50,
              background: "var(--bg-secondary)", border: "1px solid var(--border-card)",
              borderRadius: 10, padding: 6, display: "flex", flexDirection: "column", gap: 4, minWidth: 130
            }}>
              {Object.entries(typeConfig).map(([t, conf]) => (
                <div
                  key={t}
                  onClick={() => { onChange(idx, "set_type", t); setShowTypeSelector(false); }}
                  style={{
                    padding: "8px 12px", borderRadius: 7, cursor: "pointer",
                    fontSize: 13, display: "flex", alignItems: "center", gap: 8,
                    background: "transparent", color: "var(--text-primary)",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--bg-card-hover)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <div style={{
                    width: 24, height: 24, borderRadius: 12,
                    background: conf.bg, color: conf.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700
                  }}>
                    {conf.label === (idx + 1) ? "N" : conf.label}
                  </div>
                  <span style={{ textTransform: "capitalize" }}>{t === "dropset" ? "Drop Set" : t === "normal" ? "Normal" : t}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PREVIOUS column */}
        <span style={{
          fontSize: 12,
          color: beatsPrevious ? "var(--aura-accent)" : "var(--color-text-3)",
          width: 60,
          textAlign: "center",
          fontWeight: beatsPrevious ? 600 : 400,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 4
        }}>
          {beatsPrevious && <TrendingUp size={12} strokeWidth={1.8} />}{prevDisplay}
        </span>

        {type === "cardio" ? (
          <>
            <div style={{ width: 70 }}>
              <input
                type="number" step="0.1" min="0"
                value={set.km || ""} onChange={e => onChange(idx, "km", e.target.value)}
                placeholder="km" className="input-base"
                style={{ width: "100%", padding: "8px", borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-bg-hover)", color: "var(--color-text)", fontSize: 12, textAlign: "center" }}
              />
            </div>
            <div style={{ width: 70 }}>
              <input
                type="text"
                value={set.time || ""} onChange={e => onChange(idx, "time", e.target.value)}
                placeholder="mm:ss" className="input-base"
                style={{ width: "100%", padding: "8px", borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-bg-hover)", color: "var(--color-text)", fontSize: 12, textAlign: "center" }}
              />
            </div>
          </>
        ) : (
          <>
            <div style={{ width: 70 }}>
              <input
                type="number" inputMode="decimal" step="2.5"
                value={set.weight_kg ?? (type === "bodyweight" ? 0 : "")}
                onChange={e => onChange(idx, "weight_kg", e.target.value)}
                placeholder={unit || "kg"} className="input-base"
                style={{ width: "100%", padding: "8px", borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-bg-hover)", color: "var(--color-text)", fontSize: 12, textAlign: "center" }}
              />
            </div>
            <div style={{ width: 70 }}>
              <input
                type="number" inputMode="numeric" min="0"
                value={set.reps || ""} onChange={e => onChange(idx, "reps", e.target.value)}
                placeholder="reps" className="input-base"
                style={{ width: "100%", padding: "8px", borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-bg-hover)", color: "var(--color-text)", fontSize: 12, textAlign: "center" }}
              />
            </div>
          </>
        )}

        {/* ✓ Checkmark button */}
        <button
          onClick={() => setCompleted(!completed)}
          style={{
            width: 40, height: 40, borderRadius: 8, border: "1px solid var(--color-border)",
            background: completed ? "var(--aura-accent)" : "var(--color-bg-hover)",
            color: completed ? "var(--text-primary)" : "var(--color-text-3)",
            cursor: "pointer", fontSize: 18, fontWeight: 600, flexShrink: 0,
            transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center"
          }}
        >
          <CheckCircle size={18} strokeWidth={1.8} />
        </button>

        {/* Delete set */}
        {onRemove && (
          <button
            onClick={() => onRemove(idx)} title="Remove set"
            style={{
              width: 28, height: 28, borderRadius: 6, border: "none", background: "transparent",
              cursor: "pointer", color: "var(--color-text-3)", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.6,
              transition: "opacity 0.15s"
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = "1"}
            onMouseLeave={e => e.currentTarget.style.opacity = "0.6"}
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Rest Timer Countdown Bar */}
      {completed && (
        <div style={{ width: "100%", height: 2, background: "var(--color-bg-hover)", borderRadius: 1, marginTop: -1, overflow: "hidden", position: "relative" }}>
          <div style={{
            height: "100%", background: "var(--aura-accent)", width: "100%",
            transformOrigin: "left", animation: "shrinkTimer 90s linear forwards"
          }} />
        </div>
      )}
    </div>
  );
}


function ExerciseBlock({ block, idx, onChange, onRemove, exerciseList, onPickerOpen, onPRFound, onViewDetail }) {
  const [prevSets, setPrevSets] = useState([]);
  const [showOptions, setShowOptions] = useState(false);

  // Default rest time
  const defaultRest = getSyncItem(`rest_timer_${block.fullDetail?.id || ''}`) || '1m30';

  // Debounced fetch for exercise history
  useEffect(() => {
    if (!block.exercise_name) {
      setPrevSets([]);
      return;
    }

    const timer = setTimeout(() => {
      api.getExerciseHistory(block.exercise_name)
        .then(sets => setPrevSets(sets || []))
        .catch(() => setPrevSets([]));
    }, 600);

    return () => clearTimeout(timer);
  }, [block.exercise_name]);

  const addSet = () => {
    const newSets = [...block.sets, { weight_kg: "", reps: "", rpe: "", set_type: "normal" }];
    const newRestTimers = [...(block.restTimers || []), defaultRest];
    onChange(idx, "sets", newSets);
    onChange(idx, "restTimers", newRestTimers);
  };

  const updateSet = (si, f, v) => {
    const newSets = block.sets.map((s, i) => i === si ? { ...s, [f]: v } : s);
    onChange(idx, "sets", newSets);

    // Check for PR when weight/reps are updated
    if ((f === "weight_kg" || f === "reps") && onPRFound && block.exercise_name) {
      const updatedSet = newSets[si];
      const rm = epley1rm(+updatedSet.weight_kg, +updatedSet.reps);
      if (rm > 0) {
        api.getExercisePR(block.exercise_name).then(data => {
          if (data.pr && rm > data.pr) {
            onPRFound();
          }
        }).catch(() => { });
      }
    }
  };

  const removeSet = (si) => {
    const newSets = block.sets.filter((_, i) => i !== si);
    const newRestTimers = [...(block.restTimers || [])];
    if (si > 0) newRestTimers.splice(si - 1, 1);
    else newRestTimers.shift(); // if first set removed, remove the first gap

    onChange(idx, "sets", newSets);
    onChange(idx, "restTimers", newRestTimers);
  };

  const working = block.sets.filter(s => s.reps || s.km || s.time);
  const totalVol = working.reduce((a, s) => a + (+s.weight_kg || 0) * (+s.reps || 0), 0);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const type = getExerciseType(block.fullDetail || {});
  const unit = block.unit || "kg";

  return (
    <div className="glass p-4" style={{ marginBottom: 10 }}>

      {/* Exercise Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => onPickerOpen(idx)}
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 8,
            border: "1.5px solid var(--color-border)",
            background: "transparent",
            color: block.exercise_name ? "var(--aura-accent)" : "var(--color-text-3)",
            cursor: "pointer",
            textAlign: "left",
            fontSize: 14,
            fontWeight: block.exercise_name ? 700 : 400,
            transition: "all 0.2s"
          }}
        >
          {block.exercise_name || "Select exercise…"}
        </button>

        {/* Info — View Exercise Detail */}
        {block.exercise_name && (
          <button
            onClick={() => onViewDetail && onViewDetail(idx)}
            title="View exercise detail"
            style={{
              width: 36, height: 36, borderRadius: 8,
              border: "1px solid var(--color-border)",
              background: "var(--color-bg-hover)",
              color: "var(--aura-accent)",
              cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
          >
            <Info size={15} strokeWidth={1.8} />
          </button>
        )}

        {/* Link icon button */}
        <button
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            border: "1px solid var(--color-border)",
            background: "var(--color-bg-hover)",
            color: "var(--color-text-3)",
            cursor: "pointer",
            fontSize: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}
        >
          <Link2 size={16} strokeWidth={1.8} color="var(--color-text-3)" />
        </button>

        {/* Options menu button */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowOptions(!showOptions)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: "1px solid var(--color-border)",
              background: "var(--color-bg-hover)",
              color: "var(--color-text-3)",
              cursor: "pointer",
              fontSize: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0
            }}
          >
            ···
          </button>
          {showOptions && (
            <div style={{
              position: "absolute",
              right: 0,
              top: "100%",
              marginTop: 4,
              background: "var(--color-bg2)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              minWidth: 120,
              zIndex: 10
            }}>
              <button onClick={() => { onRemove(idx); setShowOptions(false); }}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "none",
                  background: "transparent",
                  color: "var(--color-text-3)",
                  cursor: "pointer",
                  fontSize: 13,
                  textAlign: "left",
                  transition: "all 0.2s"
                }}
              >
                Remove exercise
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Set Type Selector */}
      {block.exercise_name && type !== "cardio" && (
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {["warmup", "normal", "superset"].map(t => (
            <button
              key={t}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                border: "1px solid var(--color-border)",
                background: "transparent",
                color: "var(--color-text-3)",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 500,
                textTransform: "uppercase",
                opacity: 0.7
              }}
            >
              {t === "warmup" ? "Warm-up" : t === "normal" ? "Normal" : "Superset"}
            </button>
          ))}
        </div>
      )}

      {/* Column Headers */}
      {block.sets.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 8, borderBottom: "1px solid var(--color-border)", marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-3)", width: 28, textAlign: "center" }}>SET</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-3)", width: 60, textAlign: "center" }}>PREVIOUS</span>
          {type === "cardio" ? (
            <>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-3)", width: 70, textAlign: "center" }}>KM</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-3)", width: 70, textAlign: "center" }}>TIME</span>
            </>
          ) : (
            <>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-3)", width: 70, textAlign: "center", whiteSpace: "nowrap" }}>(+{unit.toUpperCase()})</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-3)", width: 70, textAlign: "center" }}>REPS</span>
            </>
          )}
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-3)", width: 40, textAlign: "center" }}>✓</span>
        </div>
      )}

      {/* Sets with rest separators */}
      {block.sets.map((s, si) => (
        <div key={si}>
          <SetRow
            set={s} idx={si}
            onChange={updateSet}
            onRemove={block.sets.length > 1 ? removeSet : null}
            exerciseName={block.exercise_name}
            prevSet={prevSets[si]}
            type={type}
            unit={unit}
          />

          {/* Rest separator between sets */}
          {si < block.sets.length - 1 && (
            <RestTimerDivider
              restTime={(block.restTimers || [])[si]}
              onChange={(val) => {
                const newTimers = [...(block.restTimers || [])];
                newTimers[si] = val;
                onChange(idx, "restTimers", newTimers);
              }}
            />
          )}
        </div>
      ))}

      {/* Progressive Overload Suggestion */}
      {block.exercise_name && block.sets.length > 0 && (
        <ProgressiveOverloadSuggestion exerciseName={block.exercise_name} />
      )}

      <button onClick={addSet} style={{
        marginTop: 8, width: "100%", padding: "10px",
        borderRadius: 8, border: "1px dashed var(--color-border)", background: "none",
        color: "var(--color-text-3)", fontSize: 13, cursor: "pointer", transition: "all 0.2s"
      }}>
        + ADD SET ({getSyncItem(`rest_timer_${block.fullDetail?.id || ''}`) || '1m30'})
      </button>

      {totalVol > 0 && (
        <div style={{
          display: "flex", gap: 14, marginTop: 8, paddingTop: 8, borderTop: "1.2px solid var(--color-border)",
          fontSize: 11, color: "var(--color-text-3)"
        }}>
          <span>{working.length} sets</span>
          <span>{fmt.int(totalVol)} kg vol</span>
        </div>
      )}
    </div>
  );
}

function emptyBlock() { return { exercise_name: "", sets: [{ weight_kg: "", reps: "", rpe: "", set_type: "normal" }], restTimers: [] }; }

export default function LogWorkout({ onSaved }) {
  const location = useLocation();
  const { theme } = useTheme();
  const [name, setName] = useState("Push");

  const [custom, setCustom] = useState("");
  const [date, setDate] = useState(today());
  const [blocks, setBlocks] = useState([emptyBlock()]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [exercises, setExercises] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedBlockIdx, setSelectedBlockIdx] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [prCelebration, setPrCelebration] = useState(null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateModalMode, setTemplateModalMode] = useState('load');
  const [planPickerOpen, setPlanPickerOpen] = useState(false);
  const [loadedPlan, setLoadedPlan] = useState(null);
  const [prefillSource, setPrefillSource] = useState(null);
  const [detailExercise, setDetailExercise] = useState(null);
  const [exerciseMap, setExerciseMap] = useState({});
  const [templates, setTemplates] = useState([]);
  const [userPlans, setUserPlans] = useState([]);

  // Live timer effect
  useEffect(() => {
    let timer;
    if (isTimerActive) {
      timer = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isTimerActive]);

  // Format time for display
  const formatTimer = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    api.getExercisesList().then(list => {
      setExercises(list.map(x => x.name));
      // Build id→exercise map for the detail sheet
      const map = {};
      list.forEach(x => { map[x.name] = x; });
      setExerciseMap(map);
    }).catch(() => { });

    // Fetch templates for quick scroll
    api.getTemplates().then(setTemplates).catch(() => { });
    api.getPlans().then(plans => setUserPlans(plans.filter(p => p.is_custom))).catch(() => { });
  }, []);

  const handleViewDetail = async (blockIdx) => {
    const block = blocks[blockIdx];
    if (!block || !block.exercise_name) return;
    let ex = block.fullDetail || exerciseMap[block.exercise_name];
    if (!ex || (!ex.gif_url && !ex.video_url && !ex.instructions && !ex.image_url)) {
      try {
        const fetched = await api.lookupExercise(block.exercise_name);
        if (fetched) {
          ex = fetched;
          setBlocks(b => b.map((bl, i) => i === blockIdx ? { ...bl, fullDetail: fetched, exercise_name: fetched.name || bl.exercise_name } : bl));
        }
      } catch (err) { }
    }
    setDetailExercise({ ...(ex || { name: block.exercise_name }), blockIdx });
  };

  const handleUnitChange = (index, newUnit) => {
    setBlocks(prev => prev.map((ex, i) => {
      if (i !== index) return ex;
      const factor = newUnit === "lb" ? 2.2046 : 1 / 2.2046;
      const shouldConvert = ex.unit !== newUnit;
      return {
        ...ex, unit: newUnit,
        sets: ex.sets.map(set => ({
          ...set,
          weight_kg: set.weight_kg && shouldConvert
            ? Math.round(set.weight_kg * factor * 10) / 10
            : set.weight_kg
        }))
      };
    }));
  };

  const updateBlock = (idx, field, val) =>
    setBlocks(b => b.map((bl, i) => i === idx ? { ...bl, [field]: val } : bl));
  const removeBlock = (idx) => setBlocks(b => b.filter((_, i) => i !== idx));

  const handlePickerOpen = (idx) => {
    setSelectedBlockIdx(idx);
    setPickerOpen(true);
  };

  const handleExerciseSelect = async (exercise) => {
    const idx = selectedBlockIdx;
    if (idx !== null) {
      updateBlock(idx, "exercise_name", exercise.name);

      const tokenVal = getSyncItem("aura_token");
      try {
        const res = await fetch(`${API_BASE_URL}/exercises/${exercise.id}`, {
          headers: { Authorization: `Bearer ${tokenVal}` }
        });
        const full = await res.json();
        setBlocks(b => b.map((bl, i) => i === idx ? {
          ...bl,
          fullDetail: full,
          unit: full.unit || getSyncItem(`weight_unit_${exercise.id}`) || "kg"
        } : bl));
      } catch (err) { }
    }
    setPickerOpen(false);
    setSelectedBlockIdx(null);
  };

  const resolveBlocksCatalogDetails = (blocksList) => {
    blocksList.forEach((b, idx) => {
      if (b.exercise_name) {
        api.lookupExercise(b.exercise_name)
          .then(full => {
            if (full) {
              setBlocks(prev => prev.map((bl, i) => i === idx ? {
                ...bl,
                exercise_name: full.name || bl.exercise_name,
                fullDetail: full,
                unit: full.unit || getSyncItem(`weight_unit_${full.id}`) || "kg"
              } : bl));
            }
          })
          .catch(() => { });
      }
    });
  };

  const handleLoadTemplate = (exercises, templateName) => {
    if (templateName) {
      setName("Custom");
      setCustom(templateName);
    }
    // Convert template exercises to blocks
    const newBlocks = exercises.map(ex => {
      if (ex.sets && Array.isArray(ex.sets)) {
        return {
          exercise_name: ex.exercise_name || ex.name,
          sets: ex.sets.map(s => ({
            weight_kg: s.weight_kg || s.weight || "",
            reps: s.reps || "",
            rpe: s.rpe || "",
            set_type: s.set_type || ex.set_type || "normal"
          })),
          restTimers: Array(Math.max(0, ex.sets.length - 1)).fill("1m30")
        };
      }

      const setCount = ex.sets_count || 1;
      return {
        exercise_name: ex.exercise_name || ex.name,
        sets: Array(setCount).fill(null).map(() => ({
          weight_kg: "", reps: "", rpe: "", set_type: ex.set_type || "normal"
        })),
        restTimers: Array(Math.max(0, setCount - 1)).fill("1m30")
      };
    });
    setBlocks(newBlocks);
    resolveBlocksCatalogDetails(newBlocks);
  };

  const handleLoadPlan = (plan, session) => {
    // Pre-fill from selected plan session
    setName("Custom");
    setCustom(`${plan.name} — ${session.label}`);

    // Create blocks from session exercises
    const newBlocks = session.exercises.map(ex => ({
      exercise_name: ex.name,
      restTimers: Array(2).fill("1m30"), // 3 sets -> 2 gaps
      sets: Array(3).fill(null).map(() => {
        // Extract lower bound from reps range (e.g., "8-10" → 8)
        const repsStr = ex.reps.split("-")[0];
        return {
          weight_kg: "",
          reps: repsStr,
          rpe: "",
          set_type: "normal"
        };
      })
    }));

    setBlocks(newBlocks);
    resolveBlocksCatalogDetails(newBlocks);
    setLoadedPlan(plan);
    setPlanPickerOpen(false);
  };

  // Load plan from recommendation if passed via navigation
  useEffect(() => {
    let prefilledList = [];
    if (location.state?.prefill) {
      const { workout_name, exercises } = location.state.prefill;
      setName("Custom");
      setCustom(workout_name);
      setPrefillSource(workout_name);
      prefilledList = exercises.map((ex, i) => {
        const setCount = ex.sets?.length || 0;
        return {
          id: Date.now() + i,
          exercise_name: ex.exercise_name,
          restTimers: Array(Math.max(0, setCount - 1)).fill("1m30"),
          sets: ex.sets,
        };
      });
      setBlocks(prefilledList);
    } else if (location.state?.plan && location.state?.session) {
      const plan = location.state.plan;
      const session = location.state.session;

      setName("Custom");
      setCustom(`${plan.name} — ${session.label}`);
      setPrefillSource(`${plan.name} — ${session.label}`);

      prefilledList = session.exercises.map((ex, i) => ({
        id: Date.now() + i,
        exercise_name: ex.name,
        restTimers: Array(2).fill("1m30"),
        sets: Array(3).fill(null).map(() => {
          const repsStr = String(ex.reps).includes("-")
            ? ex.reps.split("-")[0]
            : String(ex.reps).replace(/[^0-9]/g, "");
          return {
            weight_kg: "",
            reps: repsStr,
            rpe: "",
            set_type: "normal"
          };
        })
      }));

      setBlocks(prefilledList);
      setLoadedPlan(plan);
    }

    if (prefilledList.length > 0) {
      resolveBlocksCatalogDetails(prefilledList);
    }
  }, []);

  const totalSets = blocks.reduce((a, b) => a + b.sets.filter(s => s.reps || s.km || s.time).length, 0);
  const totalVol = blocks.reduce((a, b) => a + b.sets.reduce((x, s) => x + (+s.weight_kg || 0) * (+s.reps || 0), 0), 0);

  const handleSave = async () => {
    const wName = name === "Custom" ? custom.trim() : name;
    if (!wName) { setError("Please enter a workout name."); return; }
    const sets = [];
    for (const block of blocks) {
      if (!block.exercise_name.trim()) continue;
      const type = getExerciseType(block.fullDetail || exerciseMap[block.exercise_name] || {});

      block.sets.forEach((s, i) => {
        let weight = 0, reps = 0, distance_m = null, duration_s = null;
        if (type === "cardio") {
          if (!s.km && !s.time) return;
          distance_m = s.km ? parseFloat(s.km) * 1000 : null;
          if (s.time) {
            const parts = s.time.split(":");
            if (parts.length === 2) duration_s = parseInt(parts[0]) * 60 + parseInt(parts[1]);
            else duration_s = parseInt(s.time);
          }
        } else {
          if (!s.weight_kg && !s.reps && s.weight_kg !== 0) return;
          weight = +s.weight_kg || 0;
          reps = +s.reps || 0;
        }

        sets.push({
          exercise_name: block.exercise_name.trim(),
          set_order: String(i + 1),
          weight_kg: weight,
          reps: reps,
          rpe: s.rpe ? +s.rpe : null,
          set_type: s.set_type || "normal",
          distance_m: distance_m,
          duration_s: duration_s
        });
      });
    }
    if (!sets.length) { setError("Add at least one set with valid data."); return; }
    setSaving(true); setError(null);
    try {
      const iso = new Date(date).toISOString().replace("T", " ").slice(0, 19);
      await api.createWorkout({
        workout_name: wName,
        session_date: iso,
        duration_sec: elapsedSeconds,
        notes: notes.trim(),
        sets: sets
      });

      // Auto-save as template
      try {
        const templateBlocks = blocks.filter(b => b.exercise_name.trim()).map(b => ({
          exercise_name: b.exercise_name,
          sets: b.sets.map(s => ({
            reps: s.reps,
            weight_kg: s.weight_kg,
            set_type: s.set_type || "normal"
          }))
        }));
        if (templateBlocks.length > 0) {
          await api.saveTemplate({
            name: wName,
            exercises: templateBlocks
          });
          // Refresh quick templates list
          api.getTemplates().then(setTemplates).catch(() => { });
        }
      } catch (e) {
        console.error("Failed to auto-save template:", e);
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setBlocks([emptyBlock()]); setNotes(""); setDate(today()); setElapsedSeconds(0);
        if (onSaved) onSaved();
      }, 1500);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 100 }}>
      {/* Custom header with timer and Start button */}
      <div style={{
        background: "var(--color-bg2)", borderBottom: "1.2px solid var(--color-border)",
        padding: "24px 28px", display: "flex", alignItems: "center", justifyContent: "space-between",
        position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ zIndex: 1 }}>
          <h1 className="font-display" style={{ fontSize: 28, fontWeight: 800, color: "var(--color-text)", margin: 0 }}>Log Workout</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-3)", margin: 0, marginTop: 4, fontWeight: 600 }}>RECORD A NEW SESSION</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20, zIndex: 1 }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: "var(--aura-accent)", fontFamily: "Space Mono", textAlign: "right" }}>
            {formatTimer(elapsedSeconds)}
          </div>

          {!isTimerActive && (
            <button
              className="btn-primary"
              onClick={() => setIsTimerActive(true)}
              style={{
                padding: '12px 24px', borderRadius: 16, fontSize: 14, fontWeight: 800,
                boxShadow: '0 8px 20px rgba(var(--aura-accent-rgb), 0.3)'
              }}
            >
              START WORKOUT
            </button>
          )}
        </div>
      </div>

      <div className="page-inner" style={{ display: "flex", flexDirection: "column", gap: 12 }}>

        {/* PR Celebration Overlay */}
        {prCelebration && (
          <div style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.7)",
            flexDirection: "column",
            gap: 12,
            zIndex: 2000,
            animation: "pulse 0.6s ease-in-out"
          }}>
            <Trophy size={64} strokeWidth={1.5} style={{ color: "var(--aura-accent)" }} />
            <div style={{
              fontSize: 32, fontWeight: 700, color: "var(--aura-accent)",
              textAlign: "center",
              animation: "pulse 0.6s ease-in-out"
            }}>
              <span style={{ fontSize: 32 }}>New PR!</span>
            </div>
          </div>
        )}

        {/* Templates Quick-Action Section */}
        <div style={{ marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div className="section-label" style={{ margin: 0 }}>Workout Templates</div>
            <button
              onClick={() => { setTemplateModalMode('load'); setTemplateModalOpen(true); }}
              style={{ background: 'none', border: 'none', color: 'var(--aura-accent)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              View All
            </button>
          </div>

          <div className="template-scroll-container" style={{
            display: "flex", gap: 12, overflowX: "auto", paddingBottom: 10,
            msOverflowStyle: 'none', scrollbarWidth: 'none'
          }}>
            <style>{`.template-scroll-container::-webkit-scrollbar { display: none; }`}</style>

            {/* Create New Template Card */}
            <button
              onClick={() => {
                setTemplateModalMode('save');
                setTemplateModalOpen(true);
              }}
              style={{
                flexShrink: 0, width: 140, height: 80, borderRadius: 14,
                border: "1.5px dashed var(--border-card)", background: "var(--bg-card)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 6, cursor: "pointer", transition: "all 0.2s"
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "var(--aura-accent)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border-card)"}
            >
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(var(--aura-accent-rgb), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--aura-accent)' }}>
                <Plus size={14} strokeWidth={3} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>New Template</span>
            </button>

            {/* Template Cards will go here — they are handled by a useEffect in a real scenario, 
                for now I'll use the existing TemplateModal but I'll add a quick-load list */}
            {/* Since TemplateModal already fetches them, I'll add a state here to fetch them too for the quick list */}
            {templates.map(t => (
              <button
                key={`template-${t.id}`}
                onClick={() => handleLoadTemplate(t.exercises || [], t.name)}
                style={{
                  flexShrink: 0, width: 140, height: 80, borderRadius: 14,
                  border: "1px solid var(--border-card)", background: "var(--bg-card)",
                  display: "flex", flexDirection: "column", padding: 12,
                  gap: 4, cursor: "pointer", transition: "all 0.2s", textAlign: "left"
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = "var(--aura-accent)";
                  e.currentTarget.style.background = "var(--bg-card-hover)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = "var(--border-card)";
                  e.currentTarget.style.background = "var(--bg-card)";
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}>
                  {t.name}
                </div>
                <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>
                  {t.exercises?.length || 0} EXERCISES
                </span>
                <div style={{ marginTop: 'auto', fontSize: 10, color: 'var(--aura-accent)', fontWeight: 800 }}>LOAD →</div>
              </button>
            ))}

            {/* Program Templates (User Plans) */}
            {userPlans.map(p => (
              <button
                key={`plan-${p.id}`}
                onClick={() => {
                  setLoadedPlan(p);
                  setPlanPickerOpen(true);
                }}
                style={{
                  flexShrink: 0, width: 140, height: 80, borderRadius: 14,
                  border: "1.5px solid var(--aura-accent)", background: "rgba(var(--aura-accent-rgb), 0.05)",
                  display: "flex", flexDirection: "column", padding: 12,
                  gap: 4, cursor: "pointer", transition: "all 0.2s", textAlign: "left"
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "rgba(var(--aura-accent-rgb), 0.1)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "rgba(var(--aura-accent-rgb), 0.05)";
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--aura-accent)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}>
                  {p.name}
                </div>
                <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>
                  {p.sessions?.length || 0} SESSIONS
                </span>
                <div style={{ marginTop: 'auto', fontSize: 10, color: 'var(--aura-accent)', fontWeight: 800 }}>PROGRAM →</div>
              </button>
            ))}
          </div>
        </div>

        {/* Session info */}
        <div className="glass p-5">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 8 }}>
            <div className="section-label" style={{ margin: 0 }}>Session Details</div>
            <button
              onClick={() => setPlanPickerOpen(true)}
              style={{
                padding: "6px 12px",
                borderRadius: 20,
                border: "1px solid var(--aura-accent)",
                background: "transparent",
                color: "var(--aura-accent)",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                transition: "all 0.2s",
                whiteSpace: "nowrap",
                display: 'flex', alignItems: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(var(--aura-accent-rgb), 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            ><ClipboardList size={14} strokeWidth={1.8} style={{ marginRight: 6 }} />
              Load Training Plan
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {TYPES.map(t => (
              <button key={t} className={`type-chip${name === t ? " selected" : ""}`} onClick={() => setName(t)}>{t}</button>
            ))}
          </div>
          {name === "Custom" && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input className="input-base" value={custom} onChange={e => setCustom(e.target.value)}
                placeholder="Workout name…" style={{ flex: 1 }} />
              <button
                onClick={() => {
                  setTemplateModalMode('save');
                  setTemplateModalOpen(true);
                }}
                style={{
                  padding: "0 14px", borderRadius: 10, border: "1px solid var(--border-card)",
                  background: "var(--bg-card)", color: "var(--aura-accent)", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}
                title="Save as Template"
              >
                <Save size={16} />
              </button>
            </div>
          )}
          <div>
            <label style={{ fontSize: 11, color: "var(--color-text-3)", display: "block", marginBottom: 5 }}>Date & Time</label>
            <input type="datetime-local" className="input-base" value={date}
              onChange={e => setDate(e.target.value)} />
          </div>
        </div>

        {/* Prefill banner */}
        {prefillSource && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "rgba(139,92,246,0.12)",
            border: "1px solid var(--aura-accent)",
            borderRadius: 10, padding: "10px 16px", marginBottom: 16
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ClipboardList size={16} color="var(--aura-accent)" strokeWidth={1.8} />
              <span style={{ fontSize: 13, color: "var(--aura-accent)", fontWeight: 500 }}>
                Loaded from: {prefillSource}
              </span>
            </div>
            <button onClick={() => setPrefillSource(null)} style={{ background: "none", border: "none", cursor: "pointer" }}>
              <X size={16} color="var(--color-text-3)" strokeWidth={1.8} />
            </button>
          </div>
        )}

        {/* Loaded plan banner */}
        {!prefillSource && loadedPlan && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 14px",
              borderRadius: 10,
              background: "rgba(var(--aura-accent-rgb), 0.1)",
              border: "1px solid var(--aura-accent)",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ClipboardList size={14} strokeWidth={1.8} color="var(--aura-accent)" />
              <span style={{ fontSize: 13, color: "var(--aura-accent)", fontWeight: 500 }}>
                Loaded from: <strong>{loadedPlan.name}</strong>
              </span>
            </div>
            <button
              onClick={() => setLoadedPlan(null)}
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                border: "none",
                background: "transparent",
                color: "var(--aura-accent)",
                cursor: "pointer",
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <X size={16} color="var(--color-text-3)" strokeWidth={1.8} />
            </button>
          </div>
        )}

        {/* Live stats */}
        {(totalSets > 0 || totalVol > 0) && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {[
              [totalSets, "sets"],
              [fmt.int(totalVol), "kg volume"],
              [blocks.filter(b => b.exercise_name).length, "exercises"],
            ].map(([v, l]) => (
              <div key={l} className="glass p-4" style={{ textAlign: "center" }}>
                <div className="stat-value" style={{ fontSize: 20 }}>{v}</div>
                <div className="stat-label">{l}</div>
              </div>
            ))}
          </div>
        )}

        {/* Exercises */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 8, flexWrap: "wrap" }}>
            <div className="section-label" style={{ margin: 0 }}>Exercises</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => { setTemplateModalMode('load'); setTemplateModalOpen(true); }}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                  background: "transparent",
                  color: "var(--color-text-3)",
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 600,
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                <FolderOpen size={14} strokeWidth={1.8} /> Load
              </button>
              {blocks.filter(b => b.exercise_name).length > 0 && (
                <button
                  onClick={() => { setTemplateModalMode('save'); setTemplateModalOpen(true); }}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--color-border)",
                    background: "transparent",
                    color: "var(--color-text-3)",
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 600,
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    gap: 6
                  }}
                >
                  <Save size={14} strokeWidth={1.8} /> Save
                </button>
              )}
            </div>
            <span style={{ fontSize: 10, color: "var(--color-text-3)" }}>RPE = Rate of Perceived Exertion</span>
          </div>
          {blocks.map((b, i) => (
            <ExerciseBlock key={i} block={b} idx={i}
              onChange={updateBlock} onRemove={removeBlock} exerciseList={exercises}
              onPickerOpen={handlePickerOpen}
              onViewDetail={handleViewDetail}
              onPRFound={() => {
                setPrCelebration(true);
                setTimeout(() => setPrCelebration(null), 2000);
              }} />
          ))}
          <button onClick={() => setBlocks(b => [...b, emptyBlock()])}
            style={{
              width: "100%", padding: "12px", borderRadius: 14,
              border: "1px dashed var(--color-border)", background: "none",
              color: "var(--color-text-3)", fontSize: 13, cursor: "pointer", marginTop: 4
            }}>
            + Add Exercise
          </button>
        </div>

        {/* Notes */}
        <div className="glass p-5">
          <label style={{
            fontSize: 11, color: "var(--color-text-3)", fontWeight: 700, textTransform: "uppercase",
            letterSpacing: ".08em", display: "block", marginBottom: 8
          }}>Notes (optional)</label>
          <textarea className="input-base" rows={3} value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="How did it feel? Any PRs? Sleep quality?" />
        </div>

        {error && (
          <div style={{
            fontSize: 13, color: "var(--aura-accent3)",
            background: "color-mix(in srgb,var(--aura-accent3) 10%,transparent)",
            padding: "10px 14px", borderRadius: 10
          }}>{error}</div>
        )}

        <button className="btn-primary" onClick={handleSave} disabled={saving || success}
          style={{
            background: success ? "var(--aura-accent-success)" : undefined,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10
          }}>
          {success ? "Saved!" : saving ? "Saving…" : (
            <>
              {theme === 'queen' && <CheckCircle size={20} />}
              Save Workout
            </>
          )}
        </button>

        <div style={{
          background: "rgba(var(--aura-accent-rgb), 0.08)", border: "1px solid var(--color-border)",
          borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center",
          justifyContent: "space-between", marginTop: 8
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Heart size={16} color="#EF4444" />
            <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>How do you feel after this session?</span>
          </div>
          <Link to="/fatigue-check" style={{
            display: "flex", alignItems: "center", gap: 4, background: "none", border: "none",
            color: "#00BCD4", fontSize: 13, fontWeight: 600, textDecoration: "none"
          }}>
            Take Fatigue Check <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      {/* Template Modal */}
      {templateModalOpen && (
        <TemplateModal
          open={templateModalOpen}
          onClose={() => setTemplateModalOpen(false)}
          currentExercises={blocks}
          onLoad={(ex, name) => handleLoadTemplate(ex, name)}
          initialMode={templateModalMode}
        />
      )}

      {/* Plan Picker Modal */}
      {planPickerOpen && (
        <PlanPickerModal
          open={planPickerOpen}
          onClose={() => setPlanPickerOpen(false)}
          onSelect={handleLoadPlan}
        />
      )}

      {/* Exercise Picker Modal */}
      {pickerOpen && (
        <ExercisePicker
          onSelect={handleExerciseSelect}
          onClose={() => {
            setPickerOpen(false);
            setSelectedBlockIdx(null);
          }}
        />
      )}

      {/* Exercise Detail Sheet */}
      {detailExercise && (
        <ExerciseDetailSheet
          exercise={detailExercise}
          onClose={() => setDetailExercise(null)}
          onUnitChange={handleUnitChange}
        />
      )}
    </div>
  );
}
