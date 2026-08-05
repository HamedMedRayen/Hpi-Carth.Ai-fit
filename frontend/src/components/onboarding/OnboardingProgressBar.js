import React from "react";

export default function OnboardingProgressBar({ currentStep, totalSteps, sectionName }) {
  const percentage = Math.min(100, Math.max(0, Math.round((currentStep / totalSteps) * 100)));

  return (
    <div className="onboarding-header">
      <div className="onboarding-meta">
        <span className="onboarding-section-tag">{sectionName || "Onboarding"}</span>
        <span className="onboarding-step-counter">
          Question {currentStep} of {totalSteps}
        </span>
      </div>
      <div className="onboarding-progress-bg">
        <div 
          className="onboarding-progress-fill" 
          style={{ width: `${percentage}%` }} 
        />
      </div>
    </div>
  );
}
