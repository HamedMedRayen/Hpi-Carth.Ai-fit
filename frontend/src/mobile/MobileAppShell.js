import React, { Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../utils/auth";
import { useTheme } from "../utils/theme";
import ErrorBoundary from "../components/common/ErrorBoundary";
import Skeleton from "../components/common/SkeletonLoader";
import FloatingBottomNav from "./components/FloatingBottomNav";
import "./styles/mobile.css";
import "./styles/mobile-themes.css";

// Primary Mobile Components (eagerly loaded for native performance)
import MobileAuthFlow from "./components/MobileAuthFlow";
import MobileDashboard from "./pages/MobileDashboard";
import MobileTrainHub from "./pages/MobileTrainHub";
import MobileWorkouts from "./pages/MobileWorkouts";
import MobileNutrition from "./pages/MobileNutrition";
import MobileProgress from "./pages/MobileProgress";
import MobileBodyHub from "./pages/MobileBodyHub";
import MobileCoachingZone from "./pages/MobileCoachingZone";
import MobileInjuryLog from "./pages/MobileInjuryLog";
import MobileSleep from "./pages/MobileSleep";
import MobileChat from "./pages/MobileChat";
import MobileChallenges from "./pages/MobileChallenges";
import MobileProfile from "./pages/MobileProfile";
import MobileExercises from "./pages/MobileExercises";

// Web Fallback / Secondary Lazy Components
const FatigueCheck = React.lazy(() => import("../pages/FatigueCheck"));
const Measurements = React.lazy(() => import("../pages/Measurements"));
const ProgressPhotos = React.lazy(() => import("../pages/ProgressPhotos"));
const Exercises = React.lazy(() => import("../pages/Exercises"));
const Recommend = React.lazy(() => import("../pages/Recommend"));
const OnboardingFlow = React.lazy(() => import("../components/onboarding/OnboardingFlow"));

function MobilePageLoader() {
  return <Skeleton.Dashboard />;
}

function RequireAuth({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

export default function MobileAppShell() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const location = useLocation();
  const isAuth = location.pathname === "/auth";

  // Force a supported mobile theme ("dark", "light", "queen"), defaulting to "dark"
  const activeMobileTheme = (theme && ["dark", "light", "queen"].includes(theme)) ? theme : "dark";

  if (!user || isAuth) {
    return (
      <div className="mobile-app" data-mobile-theme={activeMobileTheme}>
        <ErrorBoundary title="Authentication Error" message="An error occurred during authentication." fullPage>
          <Suspense fallback={<MobilePageLoader />}>
            <Routes>
              <Route path="/auth" element={<MobileAuthFlow />} />
              <Route path="*" element={<Navigate to="/auth" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </div>
    );
  }

  const isOnboarding = location.pathname === "/onboarding";

  return (
    <div className="mobile-app" data-mobile-theme={activeMobileTheme}>
      <main className="mobile-main">
        <Suspense fallback={<MobilePageLoader />}>
          <ErrorBoundary title="Mobile Error" message="An error occurred. Tap to retry." fullPage>
            <Routes>
              <Route path="/" element={<RequireAuth><MobileDashboard /></RequireAuth>} />
              <Route path="/onboarding" element={<RequireAuth><OnboardingFlow /></RequireAuth>} />
              <Route path="/workouts" element={<RequireAuth><MobileTrainHub /></RequireAuth>} />
              <Route path="/workouts/log" element={<RequireAuth><MobileWorkouts /></RequireAuth>} />
              <Route path="/nutrition" element={<RequireAuth><MobileNutrition /></RequireAuth>} />
              <Route path="/progress" element={<RequireAuth><MobileProgress /></RequireAuth>} />
              <Route path="/body" element={<RequireAuth><MobileBodyHub /></RequireAuth>} />
              <Route path="/you" element={<RequireAuth><MobileProfile /></RequireAuth>} />
              <Route path="/injuries" element={<RequireAuth><MobileInjuryLog /></RequireAuth>} />
              <Route path="/sleep" element={<RequireAuth><MobileSleep /></RequireAuth>} />
              <Route path="/chat" element={<RequireAuth><MobileChat /></RequireAuth>} />
              <Route path="/challenges" element={<RequireAuth><MobileChallenges /></RequireAuth>} />
              <Route path="/coach/*" element={<RequireAuth><MobileCoachingZone /></RequireAuth>} />
              <Route path="/events" element={<RequireAuth><MobileCoachingZone /></RequireAuth>} />
              <Route path="/profile" element={<RequireAuth><MobileProfile /></RequireAuth>} />
              
              {/* Web App Routes linked by Mobile Hubs */}
              <Route path="/fatigue" element={<RequireAuth><FatigueCheck /></RequireAuth>} />
              <Route path="/measurements" element={<RequireAuth><Measurements /></RequireAuth>} />
              <Route path="/photos" element={<RequireAuth><ProgressPhotos /></RequireAuth>} />
              <Route path="/workouts/library" element={<RequireAuth><MobileExercises /></RequireAuth>} />
              <Route path="/exercises" element={<RequireAuth><MobileExercises /></RequireAuth>} />
              <Route path="/workouts/plans" element={<RequireAuth><Recommend /></RequireAuth>} />
              <Route path="/workouts/:id" element={<RequireAuth><MobileWorkouts /></RequireAuth>} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ErrorBoundary>
        </Suspense>
      </main>
      {!isOnboarding && <FloatingBottomNav />}
    </div>
  );
}
