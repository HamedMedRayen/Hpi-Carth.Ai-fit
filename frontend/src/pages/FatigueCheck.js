import React, { useState } from "react";
import Header from "../components/layout/Header";
import FatigueQuiz from "../components/widgets/FatigueQuiz";
import FatigueResult from "../components/widgets/FatigueResult";
import { computeFatigueScore } from "../utils/fatigueScoring";
import { api } from "../utils/api";

export default function FatigueCheck() {
  const [view, setView] = useState("quiz");
  const [result, setResult] = useState(null);

  const handleComplete = async (answers) => {
    const res = computeFatigueScore(answers);
    setResult(res);
    setView("result");

    try {
      await api.logFatigue({
        raw_score: res.rawScore,
        borg_score: res.borgScore,
        level: res.level,
        label: res.label,
        answers: answers
      });
    } catch (e) {
      console.error("Failed to log fatigue:", e);
    }
  };

  const handleRetake = () => {
    setResult(null);
    setView("quiz");
  };

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 100 }}>
      <Header title="Fatigue Check" subtitle="Calibrate your recovery" />
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 24px" }}>
        {view === "quiz" ? (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <FatigueQuiz onComplete={handleComplete} />
          </div>
        ) : (
          <FatigueResult result={result} onRetake={handleRetake} />
        )}
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
    </div>
  );
}
