import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dumbbell, Zap, Flame, Activity, Calendar, Info, AlertTriangle, RefreshCw, Play, ChevronDown, ChevronUp, Save, CheckCircle } from "lucide-react";
import Header from "../components/layout/Header";
import GlassCard from "../components/layout/GlassCard";
import { api, token } from "../utils/api";
import { BrainIcon } from "../utils/icons";

const GOALS = [
  { id: "muscle_gain", label: "Muscle Gain", icon: Dumbbell },
  { id: "strength", label: "Strength", icon: Zap },
  { id: "fat_loss", label: "Weight Loss", icon: Flame },
  { id: "general_fitness", label: "General Fitness", icon: Activity },
];

const LEVELS = ["beginner", "intermediate", "advanced"];
const DAYS_OPTIONS = [2, 3, 4, 5, 6];

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "var(--color-text-3)",
          textTransform: "uppercase",
          letterSpacing: "2px",
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function PillButton({ selected, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 40,
        padding: "0 16px",
        borderRadius: 20,
        border: "1px solid",
        borderColor: selected ? "var(--aura-accent)" : "var(--color-border)",
        background: selected ? "var(--aura-accent)" : "var(--color-bg-secondary)",
        color: selected ? "var(--color-on-accent)" : "var(--color-text-2)",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.2s",
      }}
    >
      {children}
    </button>
  );
}

function Chip({ selected, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px",
        borderRadius: 20,
        border: "1px solid",
        borderColor: selected ? "var(--aura-accent)" : "var(--color-border)",
        background: selected ? "var(--aura-accent)" : "var(--color-bg-secondary)",
        color: selected ? "var(--color-on-accent)" : "var(--color-text-2)",
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.2s",
      }}
    >
      {children}
    </button>
  );
}

function ExpandableSessionCard({ session, sessionIndex, totalSessions, onExerciseClick, onStartSession }) {
  const [expanded, setExpanded] = useState(sessionIndex === 0);

  return (
    <div
      style={{
        borderRadius: 12,
        border: "1px solid var(--color-border)",
        background: "var(--color-bg-secondary)",
        overflow: "hidden",
        animation: `fadeInUp 0.3s ease 0.${sessionIndex * 5}s both`,
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          borderBottom: expanded ? "1px solid var(--color-border)" : "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>
            {session.label}
          </div>
          <div
            style={{
              padding: "2px 8px",
              borderRadius: 12,
              background: "var(--aura-accent)",
              color: "var(--color-on-accent)",
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {session.exercises.length} exercises
          </div>
        </div>
        <div style={{ color: "var(--color-text-3)" }}>{expanded ? <ChevronDown size={18} strokeWidth={1.8} /> : <ChevronUp size={18} strokeWidth={1.8} />}</div>
      </button>

      {expanded && (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 12,
            }}
          >
            <thead>
              <tr style={{ background: "rgba(0,0,0,0.05)" }}>
                <th
                  style={{
                    padding: "10px 12px",
                    textAlign: "left",
                    color: "var(--color-text-3)",
                    fontWeight: 600,
                    fontSize: 11,
                  }}
                >
                  Exercise
                </th>
                <th
                  style={{
                    padding: "10px 8px",
                    textAlign: "center",
                    color: "var(--color-text-3)",
                    fontWeight: 600,
                    fontSize: 11,
                  }}
                >
                  Sets
                </th>
                <th
                  style={{
                    padding: "10px 8px",
                    textAlign: "center",
                    color: "var(--color-text-3)",
                    fontWeight: 600,
                    fontSize: 11,
                  }}
                >
                  Reps
                </th>
                <th
                  style={{
                    padding: "10px 8px",
                    textAlign: "center",
                    color: "var(--color-text-3)",
                    fontWeight: 600,
                    fontSize: 11,
                  }}
                >
                  Rest
                </th>
              </tr>
            </thead>
            <tbody>
              {session.exercises.map((ex, idx) => (
                <tr
                  key={idx}
                  style={{
                    background: idx % 2 === 0 ? "rgba(0,0,0,0.02)" : "transparent",
                    borderBottom: "1px solid var(--color-border)",
                  }}
                >
                  <td
                    style={{
                      padding: "10px 12px",
                      color: "var(--color-text-2)",
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                    onClick={() => onExerciseClick(ex.name)}
                  >
                    {ex.name}
                  </td>
                  <td style={{ padding: "10px 8px", textAlign: "center", color: "var(--color-text-2)" }}>
                    {ex.sets}
                  </td>
                  <td style={{ padding: "10px 8px", textAlign: "center", color: "var(--color-text-2)" }}>
                    {ex.reps}
                  </td>
                  <td style={{ padding: "10px 8px", textAlign: "center", color: "var(--color-text-2)" }}>
                    {ex.rest_sec}s
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {expanded && onStartSession && (
        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--color-border)" }}>
          <button
            onClick={() => onStartSession(session)}
            style={{
              background: "var(--aura-accent)",
              color: "var(--color-on-accent)",
              border: "none",
              borderRadius: 10,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <Play size={14} strokeWidth={1.8} /> Start Session
          </button>
        </div>
      )}
    </div>
  );
}

function ResultPanel({ 
  plan, 
  daysAvailable, 
  onExerciseClick, 
  onGetAnother, 
  onStartWorkout, 
  onStartSession, 
  onAddTemplates,
  addingTemplates,
  templatesAdded,
  loading 
}) {
  const navigate = useNavigate();

  if (!plan && !loading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 48,
          textAlign: "center",
          minHeight: 400,
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>
          <BrainIcon size={48} />
        </div>
        <div style={{ fontSize: 14, color: "var(--color-text-3)", marginBottom: 8 }}>
          Fill in your profile
        </div>
        <div style={{ fontSize: 16, color: "var(--aura-accent)", fontWeight: 600 }}>
          Get My Recommendation →
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 48, minHeight: 400 }}>
        <div className="spinner" />
      </div>
    );
  }

  const daysArray = Object.entries(plan.weekly_schedule);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        animation: "fadeInUp 0.3s ease",
      }}
    >
      {/* Plan Header */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text)", marginBottom: 4 }}>
            {plan.plan_name || plan.name}
          </div>
          <div style={{ fontSize: 12, fontStyle: "italic", color: "var(--color-text-3)", display: "flex", alignItems: "center", gap: 6 }}>
            {plan.data_used ? <><Activity size={14} color="var(--aura-accent)" /> Hpi AI (Personalized with your data)</> : <><BrainIcon size={14} color="var(--aura-accent)" /> Hpi AI Generated</>}
          </div>
        </div>

        {/* Stats Chips */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <div
            style={{
              padding: "6px 12px",
              borderRadius: 20,
              background: "var(--color-bg-secondary)",
              fontSize: 12,
              color: "var(--color-text-2)",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <Calendar size={14} strokeWidth={1.8} /> 4 weeks
          </div>
          <div
            style={{
              padding: "6px 12px",
              borderRadius: 20,
              background: "var(--color-bg-secondary)",
              fontSize: 12,
              color: "var(--color-text-2)",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <Dumbbell size={14} strokeWidth={1.8} /> {Object.values(plan.weekly_schedule).filter(d => d && d.toLowerCase() !== "rest").length} days/week
          </div>
          <div
            style={{
              padding: "6px 12px",
              borderRadius: 20,
              background: "var(--color-bg-secondary)",
              fontSize: 12,
              color: "var(--color-text-2)",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <Dumbbell size={14} strokeWidth={1.8} /> {plan.split_type}
          </div>
        </div>
      </div>

      {/* Description */}
      <div>
        <p style={{ fontSize: 13, color: "var(--color-text-2)", lineHeight: 1.6, margin: 0 }}>
          {plan.summary || plan.description}
        </p>
      </div>

      {/* Coaching Notes */}
      {plan.coaching_notes && plan.coaching_notes.length > 0 && (
        <div
          style={{
            background: "rgba(14, 165, 233, 0.12)",
            borderLeft: "3px solid var(--aura-accent)",
            borderRadius: 8,
            padding: "10px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--aura-accent)", textTransform: "uppercase" }}>Coach Notes</div>
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "var(--color-text-2)", lineHeight: 1.5 }}>
            {plan.coaching_notes.map((note, i) => <li key={i}>{note}</li>)}
          </ul>
        </div>
      )}



      {/* Weekly Schedule */}
      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--color-text-3)",
            textTransform: "uppercase",
            letterSpacing: "2px",
            marginBottom: 12,
          }}
        >
          WEEKLY SCHEDULE
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            scrollbarWidth: "none",
            paddingBottom: 8,
          }}
        >
          {[
            "Mon",
            "Tue",
            "Wed",
            "Thu",
            "Fri",
            "Sat",
            "Sun",
          ].map((dayAbbr, idx) => {
            const fullDays = [
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
              "Sunday",
            ];
            const fullDay = fullDays[idx];
            const session = plan.weekly_schedule[fullDay];
            const isRest = !session || session.toLowerCase() === "rest";

            return (
              <div
                key={dayAbbr}
                style={{
                  minWidth: 80,
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: isRest ? "1px solid var(--color-border)" : "1px solid var(--aura-accent)",
                  background: isRest ? "transparent" : "rgba(var(--aura-accent-rgb), 0.08)",
                  textAlign: "center",
                  flexShrink: 0,
                  opacity: isRest ? 0.4 : 1,
                  transition: "all 0.2s",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-3)", marginBottom: 4, opacity: 0.8 }}>
                  {dayAbbr}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: isRest ? "var(--color-text-3)" : "var(--aura-accent)",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {isRest ? "Rest" : session}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sessions */}
      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--color-text-3)",
            textTransform: "uppercase",
            letterSpacing: "2px",
            marginBottom: 12,
          }}
        >
          WORKOUT SESSIONS
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {plan.sessions.map((session, idx) => (
            <ExpandableSessionCard
              key={idx}
              session={session}
              sessionIndex={idx}
              totalSessions={plan.sessions.length}
              onExerciseClick={onExerciseClick}
              onStartSession={(s) => onStartSession && onStartSession(plan, s)}
            />
          ))}
        </div>
      </div>

      {/* Equipment */}
      {plan.equipment && plan.equipment.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--color-text-3)",
              textTransform: "uppercase",
              letterSpacing: "2px",
              marginBottom: 12,
            }}
          >
            EQUIPMENT NEEDED
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {plan.equipment.map((item, idx) => (
              <div
                key={idx}
                style={{
                  padding: "6px 12px",
                  borderRadius: 20,
                  border: "1px solid var(--color-border)",
                  fontSize: 12,
                  color: "var(--color-text-2)",
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
        <button
          onClick={onGetAnother}
          style={{
            padding: "16px",
            borderRadius: 14,
            border: "1px solid var(--aura-accent)",
            background: "transparent",
            color: "var(--aura-accent)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(var(--aura-accent-rgb), 0.08)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <RefreshCw size={16} strokeWidth={1.8} /> Get Another Plan
        </button>
        <button
          onClick={onStartWorkout}
          style={{
            padding: "16px",
            borderRadius: 14,
            border: "none",
            background: "var(--aura-accent)",
            color: "var(--color-on-accent)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.9";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
        >
          <Play size={16} strokeWidth={1.8} /> Start This Workout
        </button>
      </div>

      <button
        onClick={onAddTemplates}
        disabled={addingTemplates || templatesAdded}
        style={{
          width: "100%",
          padding: "16px",
          borderRadius: 14,
          border: "1px solid var(--color-border)",
          background: templatesAdded ? "rgba(16, 185, 129, 0.1)" : "var(--color-bg-secondary)",
          color: templatesAdded ? "#10b981" : "var(--color-text-2)",
          fontSize: 13,
          fontWeight: 600,
          cursor: (addingTemplates || templatesAdded) ? "default" : "pointer",
          transition: "all 0.2s",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          marginTop: 12
        }}
      >
        {addingTemplates ? (
          <div className="spinner" style={{ width: 16, height: 16, borderTopColor: "var(--aura-accent)" }} />
        ) : templatesAdded ? (
          <><CheckCircle size={16} strokeWidth={1.8} /> Added to Log Section</>
        ) : (
          <><Save size={16} strokeWidth={1.8} /> Add Program to Templates</>
        )}
      </button>

      {templatesAdded && (
        <div 
          onClick={() => navigate("/log")}
          style={{ 
            marginTop: 12, textAlign: "center", fontSize: 13, color: "var(--aura-accent)", 
            fontWeight: 700, cursor: "pointer", textDecoration: "underline" 
          }}
        >
          Go to Log Section to pick a workout →
        </div>
      )}
    </div>
  );
}

export default function Recommend() {
  const navigate = useNavigate();
  const userId = token.userId() || "1";

  const [form, setForm] = useState({
    user_id: parseInt(userId),
    sex: "M",
    experience: "intermediate",
    goal: "muscle_gain",
    days_available: 4,
    hypertension: "No",
    diabetes: "No",
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [addingTemplates, setAddingTemplates] = useState(false);
  const [templatesAdded, setTemplatesAdded] = useState(false);
  const [error, setError] = useState(null);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        goal: form.goal,
        experience: form.experience,
        days_available: form.days_available,
        gender: form.sex === "F" ? "Female" : "Male",
        age: null,
        injuries: [],
        extra_notes: `Hypertension: ${form.hypertension}, Diabetes: ${form.diabetes}`
      };
      const res = await api.getRecommendation(payload);
      setResult(res);
    } catch (err) {
      setError(err.message || "Failed to get recommendation");
    } finally {
      setLoading(false);
    }
  };

  const handleGetAnother = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        goal: form.goal,
        experience: form.experience,
        days_available: form.days_available,
        gender: form.sex === "F" ? "Female" : "Male",
        age: null,
        injuries: [],
        extra_notes: `Hypertension: ${form.hypertension}, Diabetes: ${form.diabetes}. User wants a DIFFERENT plan than previous.`
      };
      const res = await api.getRecommendation(payload);
      setResult(res);
    } catch (err) {
      setError(err.message || "Failed to get recommendation");
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = (plan, session) => {
    navigate("/log", {
      state: {
        prefill: {
          workout_name: `${plan.plan_name || plan.name} — ${session.label}`,
          exercises: session.exercises.map(ex => ({
            exercise_name: ex.name,
            rest_seconds: ex.rest_sec,
            sets: Array(3).fill(null).map(() => ({
              weight_kg: "",
              reps: String(ex.reps).includes("-")
                ? ex.reps.split("-")[0]
                : String(ex.reps).replace(/[^0-9]/g, ""),
              rpe: "",
              set_type: "normal"
            }))
          }))
        }
      }
    });
  };

  const handleStartWorkout = () => {
    if (result && result.sessions && result.sessions.length > 0) {
      handleStartSession(result, result.sessions[0]);
    }
  };

  const handleAddTemplates = async () => {
    if (!result) return;
    setAddingTemplates(true);
    setError(null);
    try {
      await api.savePlan(result);
      setTemplatesAdded(true);
      setTimeout(() => setTemplatesAdded(false), 3000);
    } catch (err) {
      setError(err.message || "Failed to add program");
    } finally {
      setAddingTemplates(false);
    }
  };

  const handleExerciseClick = (exerciseName) => {
    navigate("/log", { state: { exercise: exerciseName } });
  };

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 60 }}>
      <Header title="AI Coach & Recommend" subtitle="Get a deeply personalized workout plan generated by Hpi" />

      <div style={{ padding: "20px", maxWidth: 1200, margin: "0 auto" }}>
        <GlassCard
          style={{
            borderRadius: 20,
            padding: 28,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 32,
          }}
        >
          {/* Left Column — Profile Form */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Header */}
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--color-text-3)",
                  textTransform: "uppercase",
                  letterSpacing: "2px",
                  marginBottom: 8,
                }}
              >
                YOUR PROFILE
              </div>
              <div style={{ fontSize: 14, color: "var(--color-text-2)" }}>
                Tell us about yourself
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 20,
                flex: 1,
              }}
            >
              {/* Sex */}
              <Field label="Sex">
                <div style={{ display: "flex", gap: 8 }}>
                  <PillButton selected={form.sex === "M"} onClick={() => set("sex", "M")}>
                    M
                  </PillButton>
                  <PillButton selected={form.sex === "F"} onClick={() => set("sex", "F")}>
                    F
                  </PillButton>
                </div>
              </Field>

              {/* Experience */}
              <Field label="Experience">
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {LEVELS.map((level) => (
                    <Chip
                      key={level}
                      selected={form.experience === level}
                      onClick={() => set("experience", level)}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </Chip>
                  ))}
                </div>
              </Field>

              {/* Primary Goal */}
              <Field label="Primary Goal">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {GOALS.map((goal) => {
                    const IconComponent = goal.icon;
                    const isSelected = form.goal === goal.id;
                    return (
                      <button
                        key={goal.id}
                        onClick={() => set("goal", goal.id)}
                        style={{
                          padding: 12,
                          borderRadius: 12,
                          border: "1px solid",
                          borderColor: isSelected ? "var(--aura-accent)" : "var(--color-border)",
                          background: isSelected ? "var(--aura-accent)" : "var(--color-bg-secondary)",
                          color: isSelected ? "var(--color-on-accent)" : "var(--color-text-2)",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.2s",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <IconComponent
                          size={22}
                          strokeWidth={1.8}
                          color={isSelected ? "var(--color-on-accent)" : "var(--aura-accent)"}
                        />
                        {goal.label}
                      </button>
                    );
                  })}
                </div>
              </Field>

              {/* Days per Week */}
              <Field label="Days per Week">
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[2, 3, 4, 5, 6].map((d) => (
                    <Chip
                      key={d}
                      selected={form.days_available === d}
                      onClick={() => set("days_available", d)}
                    >
                      {d}
                    </Chip>
                  ))}
                </div>
              </Field>

              {/* Health Conditions */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Hypertension">
                  <div style={{ display: "flex", gap: 8 }}>
                    <Chip
                      selected={form.hypertension === "No"}
                      onClick={() => set("hypertension", "No")}
                    >
                      No
                    </Chip>
                    <Chip
                      selected={form.hypertension === "Yes"}
                      onClick={() => set("hypertension", "Yes")}
                    >
                      Yes
                    </Chip>
                  </div>
                </Field>
                <Field label="Diabetes">
                  <div style={{ display: "flex", gap: 8 }}>
                    <Chip selected={form.diabetes === "No"} onClick={() => set("diabetes", "No")}>
                      No
                    </Chip>
                    <Chip selected={form.diabetes === "Yes"} onClick={() => set("diabetes", "Yes")}>
                      Yes
                    </Chip>
                  </div>
                </Field>
              </div>

              {error && (
                <div
                  style={{
                    fontSize: 12,
                    color: "#f87171",
                    background: "rgba(248,113,113,0.1)",
                    padding: "10px 14px",
                    borderRadius: 8,
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: "auto",
                  height: 52,
                  borderRadius: 14,
                  border: "none",
                  background: "var(--aura-accent)",
                  color: "var(--color-on-accent)",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "all 0.2s",
                  opacity: loading ? 0.6 : 1,
                }}
                onMouseEnter={(e) => !loading && (e.target.style.opacity = "0.9")}
                onMouseLeave={(e) => (e.target.style.opacity = loading ? "0.6" : "1")}
              >
                {loading ? (
                  <>
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        border: "2px solid rgba(255,255,255,0.3)",
                        borderTopColor: "var(--color-on-accent)",
                        animation: "spin 0.8s linear infinite",
                      }}
                    />
                    Generating…
                  </>
                ) : (
                  <>Get My Recommendation →</>
                )}
              </button>
            </form>
          </div>

          {/* Right Column — Result Panel */}
          <ResultPanel
            plan={result}
            loading={loading}
            onGetAnother={handleGetAnother}
            onStartWorkout={handleStartWorkout}
            onStartSession={handleStartSession}
            onExerciseClick={handleExerciseClick}
            onAddTemplates={handleAddTemplates}
            addingTemplates={addingTemplates}
            templatesAdded={templatesAdded}
          />
        </GlassCard>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        @media (max-width: 768px) {
          div[style*="gridTemplateColumns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
