import React, { Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../utils/auth";
import { useTheme } from "../utils/theme";
import ErrorBoundary from "../components/ErrorBoundary";
import Skeleton from "../components/SkeletonLoader";
import FloatingBottomNav from "./components/FloatingBottomNav";
import "./styles/mobile.css";
import "./styles/mobile-themes.css";

// Lazy-loaded mobile pages
const MobileAuthFlow = React.lazy(() => import("./components/MobileAuthFlow"));
const MobileDashboard = React.lazy(() => import("./pages/MobileDashboard"));
const MobileTrainHub = React.lazy(() => import("./pages/MobileTrainHub"));
const MobileWorkouts = React.lazy(() => import("./pages/MobileWorkouts"));
const MobileNutrition = React.lazy(() => import("./pages/MobileNutrition"));
const MobileProgress = React.lazy(() => import("./pages/MobileProgress"));
const MobileBodyHub = React.lazy(() => import("./pages/MobileBodyHub"));
const MobileCoachingZone = React.lazy(() => import("./pages/MobileCoachingZone"));
const MobileInjuryLog = React.lazy(() => import("./pages/MobileInjuryLog"));
const MobileSleep = React.lazy(() => import("./pages/MobileSleep"));
const MobileChat = React.lazy(() => import("./pages/MobileChat"));
const MobileChallenges = React.lazy(() => import("./pages/MobileChallenges"));
const MobileProfile = React.lazy(() => import("./pages/MobileProfile"));
const MobileExercises = React.lazy(() => import("./pages/MobileExercises"));

// Web App Fallback Components for missing mobile ones
const FatigueCheck = React.lazy(() => import("../pages/FatigueCheck"));
const Measurements = React.lazy(() => import("../pages/Measurements"));
const ProgressPhotos = React.lazy(() => import("../pages/ProgressPhotos"));
const Exercises = React.lazy(() => import("../pages/Exercises"));
const Recommend = React.lazy(() => import("../pages/Recommend"));

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

  if (!user || isAuth) {
    return (
      <div className="mobile-app" data-mobile-theme={theme}>
        <Suspense fallback={<MobilePageLoader />}>
          <Routes>
            <Route path="/auth" element={<MobileAuthFlow />} />
            <Route path="*" element={<Navigate to="/auth" replace />} />
          </Routes>
        </Suspense>
      </div>
    );
  }

  return (
    <div className="mobile-app" data-mobile-theme={theme}>
      <main className="mobile-main">
        <Suspense fallback={<MobilePageLoader />}>
          <ErrorBoundary title="Mobile Error" message="An error occurred. Tap to retry." fullPage>
            <Routes>
              <Route path="/" element={<RequireAuth><MobileDashboard /></RequireAuth>} />
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
              <Route path="/coach" element={<RequireAuth><MobileCoachingZone /></RequireAuth>} />
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
      <FloatingBottomNav />
    </div>
  );
}
