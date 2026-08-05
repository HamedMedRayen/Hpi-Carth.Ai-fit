import React from "react";

export default function OnboardingSummary({ questions, answers, onEditQuestion, onSubmit, loading }) {
  let requiredCount = 0;
  let requiredAnswered = 0;
  let optionalCount = 0;
  let optionalAnswered = 0;

  questions.forEach((q) => {
    const val = answers[q.id];
    let isAnswered = false;
    if (val !== undefined && val !== null && val !== "") {
      if (Array.isArray(val) && val.length > 0) isAnswered = true;
      else if (typeof val === "object" && Object.keys(val).length > 0) isAnswered = true;
      else if (typeof val !== "object") isAnswered = true;
    }

    if (q.required) {
      requiredCount++;
      if (isAnswered) requiredAnswered++;
    } else {
      optionalCount++;
      if (isAnswered) optionalAnswered++;
    }
  });

  const optionalSkipped = optionalCount - optionalAnswered;

  return (
    <div className="summary-container slide-enter-next">
      <div className="question-title-wrap">
        <span className="onboarding-section-tag" style={{ alignSelf: 'center' }}>
          Almost Done!
        </span>
        <h2 className="question-title" style={{ textAlign: 'center' }}>
          Review Your Onboarding Profile
        </h2>
        <p className="question-subtitle" style={{ textAlign: 'center' }}>
          We've customized your experience based on your responses. You can complete or update any optional questions anytime in your profile.
        </p>
      </div>

      <div className="summary-card">
        <div className="summary-stat-row">
          <span className="summary-label">Required Questions:</span>
          <span className="summary-value" style={{ color: '#10b981' }}>
            {requiredAnswered} of {requiredCount} completed
          </span>
        </div>
        <div className="summary-stat-row">
          <span className="summary-label">Optional Questions Answered:</span>
          <span className="summary-value">{optionalAnswered}</span>
        </div>
        <div className="summary-stat-row">
          <span className="summary-label">Optional Questions Skipped:</span>
          <span className="summary-value">{optionalSkipped}</span>
        </div>
      </div>

      <button
        type="button"
        className="btn-submit-onboarding"
        onClick={onSubmit}
        disabled={loading}
      >
        {loading ? "Saving Profile..." : "Complete Onboarding"}
      </button>
    </div>
  );
}
