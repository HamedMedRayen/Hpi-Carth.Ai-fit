import React, { useState } from "react";
import { Activity, Moon, Heart, Dumbbell, Wind, Brain, Zap } from "lucide-react";

const QUESTIONS = [
  { id: 'Q1', Icon: Activity, text: "How physically exhausted do you feel right now?" },
  { id: 'Q2', Icon: Dumbbell, text: "How heavy or tired do your muscles feel?" },
  { id: 'Q3', Icon: Wind, text: "How would you rate your breathing effort during training?" },
  { id: 'Q4', Icon: Brain, text: "How mentally drained or unfocused do you feel?" },
  { id: 'Q5', Icon: Moon, text: "How well did you sleep last night?" },
  { id: 'Q6', Icon: Zap, text: "How motivated do you feel to train right now?" },
  { id: 'Q7', Icon: Heart, text: "How much muscle soreness or pain are you experiencing?" },
];

export default function FatigueQuiz({ onComplete }) {
  const [answers, setAnswers] = useState({});

  const isComplete = Object.keys(answers).length === QUESTIONS.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 40 }}>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: "var(--color-text)", marginBottom: 8 }}>Fatigue Check</h2>
        <p style={{ fontSize: 14, color: "var(--color-text-2)" }}>Answer these questions honestly to calibrate your recovery.</p>
      </div>

      {QUESTIONS.map((q) => {
        const val = answers[q.id];
        return (
          <div key={q.id} style={{ background: "var(--color-surface)", border: "0.5px solid var(--color-border)", borderRadius: 16, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(0,188,212,0.1)", color: "#00BCD4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <q.Icon size={18} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text)", lineHeight: 1.4 }}>{q.text}</div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 8 }}>
                {[1, 2, 3, 4, 5].map((scaleVal) => (
                  <button
                    key={scaleVal}
                    onClick={() => setAnswers(prev => ({ ...prev, [q.id]: scaleVal }))}
                    style={{
                      width: 40, height: 40, borderRadius: "50%", cursor: "pointer",
                      transition: "all 0.15s", fontSize: 14, fontWeight: 600,
                      fontFamily: "inherit",
                      border: val === scaleVal ? "2px solid var(--aura-accent)" : "1px solid var(--color-scale-border)",
                      background: val === scaleVal ? "var(--aura-accent)" : "transparent",
                      color: val === scaleVal ? "#fff" : "var(--color-text-2)",
                      transform: "scale(1)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                    onMouseDown={e => e.currentTarget.style.transform = "scale(0.9)"}
                    onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
                    onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                  >
                    {scaleVal}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--color-text-3)" }}>
                <span>Not at all</span>
                <span>Extremely</span>
              </div>
            </div>
          </div>
        );
      })}

      <button
        disabled={!isComplete}
        onClick={() => onComplete(answers)}
        style={{
          marginTop: 16, width: "100%", padding: 14, borderRadius: 12, border: "none",
          fontSize: 16, fontWeight: 700, transition: "all 0.15s",
          background: isComplete ? "var(--aura-accent)" : "var(--color-border)",
          color: isComplete ? "#fff" : "var(--color-text-3)",
          cursor: isComplete ? "pointer" : "not-allowed"
        }}
        onMouseEnter={e => isComplete && (e.currentTarget.style.opacity = 0.85)}
        onMouseLeave={e => isComplete && (e.currentTarget.style.opacity = 1)}
      >
        See Results
      </button>
    </div>
  );
}
