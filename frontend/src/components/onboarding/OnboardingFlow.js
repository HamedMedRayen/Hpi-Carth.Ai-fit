import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../utils/auth";
import { api } from "../../utils/api";
import OnboardingProgressBar from "./OnboardingProgressBar";
import QuestionSlide from "./QuestionSlide";
import OnboardingSummary from "./OnboardingSummary";
import "./onboarding.css";

const DRAFT_KEY = "hpi_onboarding_draft";

export const ALL_QUESTIONS = [
  // Section 1 — Personal Info
  {
    id: "name",
    section: "Personal Info",
    question: "What's your name?",
    subtitle: "We'd love to know what to call you",
    type: "text",
    required: false,
  },
  {
    id: "date_of_birth",
    section: "Personal Info",
    question: "What's your date of birth?",
    subtitle: "This helps us calculate accurate age-adjusted metrics and nutrition",
    type: "date",
    required: true,
  },
  {
    id: "biological_sex",
    section: "Personal Info",
    question: "What's your biological sex?",
    subtitle: "This helps us calculate accurate calorie and strength targets",
    type: "mcq",
    options: ["Male", "Female", "Prefer not to say"],
    required: true,
  },
  {
    id: "height",
    section: "Personal Info",
    question: "What's your height?",
    subtitle: "Used for BMI and energy expenditure estimation",
    type: "numeric",
    unitToggle: "height",
    required: true,
  },
  {
    id: "current_weight",
    section: "Personal Info",
    question: "What's your current weight?",
    subtitle: "Used to establish your baseline starting metrics",
    type: "numeric",
    unitToggle: "weight",
    required: true,
  },
  {
    id: "goal_weight",
    section: "Personal Info",
    question: "What's your goal weight?",
    subtitle: "Your target weight for guidance (optional)",
    type: "numeric",
    unitToggle: "weight",
    required: false,
  },

  // Section 2 — Goals
  {
    id: "primary_goal",
    section: "Goals",
    question: "What's your primary goal?",
    subtitle: "Select the main focus of your training program",
    type: "mcq",
    options: [
      "Lose weight",
      "Build muscle",
      "Improve overall fitness/endurance",
      "Maintain current weight/health",
      "Train for a specific event"
    ],
    required: true,
  },
  {
    id: "event_details",
    section: "Goals",
    question: "What is your target event and date?",
    subtitle: "e.g., Marathon in October, Powerlifting meet in December",
    type: "text",
    required: false,
    skipIf: (a) => a.primary_goal !== "Train for a specific event",
  },
  {
    id: "goal_pace",
    section: "Goals",
    question: "How fast do you want to reach your goal?",
    subtitle: "Select your desired rate of progression",
    type: "mcq",
    options: ["Gradual & sustainable", "Moderate pace", "Aggressive/fast results"],
    required: false,
  },

  // Section 3 — Fitness & Activity Level
  {
    id: "fitness_level",
    section: "Fitness & Activity",
    question: "How would you describe your current fitness level?",
    subtitle: "Honest assessment helps us prescribe optimal initial intensity",
    type: "mcq",
    options: ["Beginner", "Intermediate", "Advanced", "Athlete"],
    required: true,
  },
  {
    id: "activity_level",
    section: "Fitness & Activity",
    question: "How active is your daily life outside of workouts?",
    subtitle: "Calculates total daily energy expenditure (TDEE)",
    type: "mcq",
    options: ["Sedentary", "Lightly active", "Moderately active", "Very active"],
    required: true,
  },
  {
    id: "prior_program_experience",
    section: "Fitness & Activity",
    question: "Have you followed a structured training program before?",
    subtitle: "Helps tailor program complexity and split selection",
    type: "mcq",
    options: ["Never", "Yes, in the past", "Yes, currently"],
    required: false,
  },

  // Section 4 — Training Preferences
  {
    id: "training_type",
    section: "Training Preferences",
    question: "What type of training do you enjoy or want to focus on?",
    subtitle: "Select one or more modalities",
    type: "mcq-multi",
    options: [
      "Strength training",
      "Cardio",
      "Flexibility/mobility",
      "Mixed/functional (HIIT)",
      "Sports-specific"
    ],
    required: true,
  },
  {
    id: "training_location",
    section: "Training Preferences",
    question: "Where will you primarily train?",
    subtitle: "We will only suggest exercises for available equipment",
    type: "mcq",
    options: [
      "Full commercial gym",
      "Home gym with basic equipment",
      "Home, no equipment",
      "Outdoors"
    ],
    required: true,
  },
  {
    id: "days_per_week",
    section: "Training Preferences",
    question: "How many days per week can you commit to training?",
    subtitle: "Used to build your weekly split schedule",
    type: "mcq",
    options: ["1–2", "3–4", "5–6", "7"],
    required: true,
  },
  {
    id: "session_length",
    section: "Training Preferences",
    question: "How much time do you have per session?",
    subtitle: "Optimizes set volume and rest interval planning",
    type: "mcq",
    options: ["15–30 min", "30–45 min", "45–60 min", "60+ min"],
    required: true,
  },
  {
    id: "exercises_to_avoid",
    section: "Training Preferences",
    question: "Any exercises you specifically want to avoid?",
    subtitle: "e.g., Barbell back squats, Overhead press",
    type: "text",
    required: false,
  },

  // Section 5 — Health & Limitations
  {
    id: "injuries",
    section: "Health & Limitations",
    question: "Do you have any injuries or physical limitations?",
    subtitle: "Safety first — we will filter out risk movements",
    type: "hybrid",
    options: ["None", "Knee/leg issues", "Back/shoulder issues", "Other → please specify"],
    required: true,
  },
  {
    id: "medical_conditions",
    section: "Health & Limitations",
    question: "Do you have any medical conditions affecting exercise or diet?",
    subtitle: "Select all that apply",
    type: "hybrid-multi",
    options: ["None", "Diabetes", "Hypertension", "Heart condition", "Other → please specify"],
    required: true,
  },
  {
    id: "pregnancy_status",
    section: "Health & Limitations",
    question: "Are you currently pregnant or postpartum?",
    subtitle: "Applies specific pregnancy safety guidelines",
    type: "mcq",
    options: ["No", "Pregnant", "Postpartum"],
    required: true,
    skipIf: (a) => a.biological_sex !== "Female",
  },

  // Section 6 — Nutrition Preferences
  {
    id: "diet_type",
    section: "Nutrition Preferences",
    question: "Do you follow a specific diet?",
    subtitle: "Tailors meal plans and recipe recommendations",
    type: "hybrid",
    options: ["No restrictions", "Vegetarian", "Vegan", "Keto/low-carb", "Other → please specify"],
    required: false,
  },
  {
    id: "allergies",
    section: "Nutrition Preferences",
    question: "Do you have food allergies or intolerances?",
    subtitle: "Filters out incompatible ingredients",
    type: "hybrid",
    options: ["None", "Gluten", "Dairy/lactose", "Nuts", "Other → please specify"],
    required: false,
  },
  {
    id: "eating_habits",
    section: "Nutrition Preferences",
    question: "How would you rate your current eating habits?",
    subtitle: "Helps establish diet adjustment strategy",
    type: "mcq",
    options: ["Very healthy/consistent", "Somewhat balanced", "Inconsistent", "Poor/unstructured"],
    required: false,
  },
  {
    id: "meals_per_day",
    section: "Nutrition Preferences",
    question: "How many meals do you typically eat per day?",
    subtitle: "Distributes macro targets evenly across meals",
    type: "mcq",
    options: ["1–2", "3", "4–5", "6+"],
    required: false,
  },

  // Section 7 — Motivation & Behavior
  {
    id: "past_obstacles",
    section: "Motivation & Behavior",
    question: "What has stopped you from reaching your goals before?",
    subtitle: "Helps us keep you accountable and on track",
    type: "mcq",
    options: [
      "Lack of time",
      "Lack of motivation/consistency",
      "Not knowing what to do",
      "Injuries/setbacks",
      "First time trying"
    ],
    required: false,
  },
  {
    id: "tracking_preference",
    section: "Motivation & Behavior",
    question: "How do you prefer to track progress?",
    subtitle: "Select your preferred feedback loops",
    type: "mcq-multi",
    options: ["Weight/scale", "Photos", "Body measurements", "Performance milestones"],
    required: false,
  },
  {
    id: "notifications",
    section: "Motivation & Behavior",
    question: "Would you like reminders to stay on track?",
    subtitle: "You can adjust push notification settings anytime",
    type: "mcq",
    options: ["Yes, daily", "Yes, weekly", "No thanks"],
    required: false,
  },
];

export default function OnboardingFlow() {
  const navigate = useNavigate();
  const { updateProfile } = useAuth();

  // Load initial draft from localStorage if available
  const [answers, setAnswers] = useState(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [direction, setDirection] = useState("next");
  const [submitting, setSubmitting] = useState(false);

  // Filter out skipped conditional questions
  const visibleQuestions = useMemo(() => {
    return ALL_QUESTIONS.filter((q) => !q.skipIf || !q.skipIf(answers));
  }, [answers]);

  // Save answers to draft storage on change
  const handleAnswerChange = (questionId, value) => {
    const nextAnswers = { ...answers, [questionId]: value };
    setAnswers(nextAnswers);
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(nextAnswers));
    } catch (e) {
      console.warn("Could not save onboarding draft to localStorage", e);
    }
  };

  const isSummaryScreen = currentStepIndex >= visibleQuestions.length;
  const currentQuestion = visibleQuestions[currentStepIndex];

  // Validate if current step satisfies required rule
  const isCurrentStepValid = () => {
    if (isSummaryScreen) return true;
    if (!currentQuestion) return false;
    if (!currentQuestion.required) return true;

    const val = answers[currentQuestion.id];
    if (val === undefined || val === null || val === "") return false;
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === "object") {
      if (val.year) return !!(val.day && val.month && val.year); // Date check
      if (val.selected) {
        if (Array.isArray(val.selected)) return val.selected.length > 0;
        return true;
      }
      if (val.value) return !!val.value; // Numeric object with unit
      return Object.keys(val).length > 0;
    }
    return true;
  };

  const handleNext = () => {
    if (!isCurrentStepValid()) return;
    setDirection("next");
    setCurrentStepIndex((prev) => Math.min(visibleQuestions.length, prev + 1));
  };

  const handleBack = () => {
    setDirection("prev");
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  };

  const handleSkip = () => {
    setDirection("next");
    setCurrentStepIndex((prev) => Math.min(visibleQuestions.length, prev + 1));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await api.saveOnboarding(answers);
      const userProfile = res?.user || {};
      await updateProfile({
        ...userProfile,
        onboarding_completed: true
      });
      localStorage.removeItem(DRAFT_KEY);
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Failed to save onboarding", err);
      alert("There was an error saving your onboarding responses. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="onboarding-screen">
      {/* Header Progress Bar */}
      <OnboardingProgressBar
        currentStep={Math.min(currentStepIndex + 1, visibleQuestions.length)}
        totalSteps={visibleQuestions.length}
        sectionName={
          isSummaryScreen
            ? "Complete Onboarding"
            : currentQuestion?.section || "Onboarding"
        }
      />

      {/* Main Slide Area */}
      <div className="onboarding-slide-container">
        {isSummaryScreen ? (
          <OnboardingSummary
            questions={visibleQuestions}
            answers={answers}
            onEditQuestion={(idx) => {
              setDirection("prev");
              setCurrentStepIndex(idx);
            }}
            onSubmit={handleSubmit}
            loading={submitting}
          />
        ) : (
          currentQuestion && (
            <QuestionSlide
              questionConfig={currentQuestion}
              value={answers[currentQuestion.id]}
              onChange={(val) => handleAnswerChange(currentQuestion.id, val)}
              direction={direction}
            />
          )
        )}
      </div>

      {/* Footer Controls */}
      <div className="onboarding-footer">
        <button
          type="button"
          className="btn-back"
          onClick={handleBack}
          disabled={currentStepIndex === 0 || submitting}
        >
          ← Back
        </button>

        {!isSummaryScreen && (
          <div className="footer-actions-right">
            {!currentQuestion?.required && (
              <button
                type="button"
                className="btn-skip"
                onClick={handleSkip}
                disabled={submitting}
              >
                Skip
              </button>
            )}

            <button
              type="button"
              className="btn-next"
              onClick={handleNext}
              disabled={!isCurrentStepValid() || submitting}
            >
              {currentStepIndex === visibleQuestions.length - 1 ? "Review →" : "Next →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
