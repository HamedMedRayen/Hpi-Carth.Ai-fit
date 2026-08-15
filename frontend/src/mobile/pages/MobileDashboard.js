import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../utils/auth";
import { api } from "../../utils/api";
import { resolveBackendUrl } from "../../utils/config";
import { fmt } from "../../utils/formatters";
import { useToast } from "../../components/common/Toast";
import {
  Bell, Search, Dumbbell, Activity, Calendar,
  Brain, Zap, ChevronRight, TrendingUp, Plus,
  CheckCircle, Trash2, AlertCircle, Utensils, Flame,
  Camera, ArrowUpRight, Sparkles, Heart, Award, Shield,
  Droplets, Check, Play, Clock, Target, Layers
} from "lucide-react";
import "../styles/mobile.css";
import MobileBottomSheet from "../components/MobileBottomSheet";

// Quick synchronous cache helper to prevent any 2000 kcal flashing/lag
const getCachedTargets = () => {
  try {
    const saved = localStorage.getItem("hpi_cached_nutrition_targets");
    if (saved) return JSON.parse(saved);
  } catch {}
  return { calories: 2000, protein: 150, carbs: 220, fat: 65, water: 3000 };
};

export default function MobileDashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  
  const [stats, setStats] = useState({});
  const [dashboardData, setDashboardData] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Nutrition & Calorie Ring State (initialized instantly from cache to avoid default lag/flash)
  const [nutritionTargets, setNutritionTargets] = useState(getCachedTargets);
  const [todayNutrition, setTodayNutrition] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    meals: []
  });
  const [todayWater, setTodayWater] = useState(0);
  const [recentWorkouts, setRecentWorkouts] = useState([]);
  const [loggingWater, setLoggingWater] = useState(false);

  const fetchNotifications = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDashboardContent = useCallback(async () => {
    const uid = user?.user_id || user?.id;
    try {
      // Parallel fetch for speed
      const [statsRes, todayNut, targetsRes, waterRes, workoutsRes] = await Promise.all([
        api.getDashboardStats().catch(() => ({})),
        api.getNutritionToday().catch(() => null),
        api.getLatestNutritionTargets().catch(() => null),
        api.getWaterToday().catch(() => null),
        api.getWorkouts?.(5).catch(() => null)
      ]);

      setStats(statsRes || {});

      if (uid) {
        api.getDashboardAnalytics(uid).then(setDashboardData).catch(() => {});
      }

      if (targetsRes) {
        const nextTargets = {
          calories: targetsRes.calories || 2000,
          protein: targetsRes.protein_g || 150,
          carbs: targetsRes.carbs_g || 220,
          fat: targetsRes.fat_g || 65,
          water: targetsRes.water_ml || targetsRes.water || 3000
        };
        setNutritionTargets(nextTargets);
        try {
          localStorage.setItem("hpi_cached_nutrition_targets", JSON.stringify(nextTargets));
        } catch {}
      }

      if (todayNut) {
        const meals = todayNut.meals || todayNut.logs || [];
        const totalKcal = Math.round(meals.reduce((sum, m) => sum + (m.calories || 0), 0));
        const totalP = Math.round(meals.reduce((sum, m) => sum + (m.protein_g || 0), 0));
        const totalC = Math.round(meals.reduce((sum, m) => sum + (m.carbs_g || 0), 0));
        const totalF = Math.round(meals.reduce((sum, m) => sum + (m.fat_g || 0), 0));
        setTodayNutrition({
          calories: totalKcal,
          protein: totalP,
          carbs: totalC,
          fat: totalF,
          meals: meals
        });
      }

      if (waterRes) {
        setTodayWater(waterRes.amount_ml || waterRes.total_ml || 0);
      }

      if (workoutsRes && workoutsRes.length > 0) {
        setRecentWorkouts(workoutsRes.slice(0, 3));
      } else if (statsRes?.recent_workouts) {
        setRecentWorkouts(statsRes.recent_workouts.slice(0, 3));
      }
    } catch (e) {
      console.error("Failed to load dashboard data", e);
    }
  }, [user?.user_id, user?.id]);

  useEffect(() => {
    fetchDashboardContent();
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchDashboardContent]);

  // Quick 1-Tap Water Logging (+250ml)
  const handleQuickAddWater = async () => {
    if (loggingWater) return;
    setLoggingWater(true);
    const added = 250;
    const newTotal = todayWater + added;
    setTodayWater(newTotal);
    try {
      await api.logWater(added, "add");
      toast.success(`Logged +250ml Water (${newTotal} ml total)`);
    } catch (e) {
      toast.error("Failed to save water: " + e.message);
    } finally {
      setLoggingWater(false);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteNotification(id);
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddWorkout = async (notification) => {
    try {
      const programName = notification.data.program_name || "Suggested Program";
      const workouts = notification.data.workouts || [];
      
      for (const w of workouts) {
        const templateData = {
          name: `${programName} - ${w.name}`,
          exercises: w.exercises
        };
        await api.saveTemplate(templateData);
      }
      
      await api.markNotificationRead(notification.id);
      fetchNotifications();
      navigate('/workouts');
    } catch (e) {
      console.error("Failed to save templates", e);
    }
  };

  const totalVolume = stats.total_volume_kg || stats.total_volume_tonnes * 1000 || 0;
  const sessions = stats.total_sessions || stats.total_workouts || 0;
  const streak = stats.current_streak_days || stats.current_streak || 0;
  const avgDuration = stats.avg_duration_minutes || stats.avg_session_duration_min || 45;
  const greetingName = (user?.nickname || user?.display_name || user?.name || "Athlete");

  const volumeLabel = totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}k` : `${Math.round(totalVolume)}`;

  // Multi-Ring Math
  const goalKcal = nutritionTargets.calories || 2000;
  const eatenKcal = todayNutrition.calories || 0;
  const remainingKcal = Math.max(0, goalKcal - eatenKcal);

  // Outer Ring: Calories (Radius 42)
  const ringRadiusCal = 42;
  const circumCal = 2 * Math.PI * ringRadiusCal;
  const pctCal = goalKcal > 0 ? Math.min(100, (eatenKcal / goalKcal) * 100) : 0;
  const offsetCal = circumCal - (pctCal / 100) * circumCal;

  // Middle Ring: Workout Effort / Volume (Radius 33)
  const targetVolumeDay = 3500;
  const todayVolumeEst = recentWorkouts.length > 0 ? (recentWorkouts[0].volume || 2800) : 0;
  const ringRadiusVol = 33;
  const circumVol = 2 * Math.PI * ringRadiusVol;
  const pctVol = Math.min(100, (todayVolumeEst / targetVolumeDay) * 100);
  const offsetVol = circumVol - (pctVol / 100) * circumVol;

  // Inner Ring: Hydration (Radius 24)
  const goalWater = nutritionTargets.water || 3000;
  const ringRadiusWater = 24;
  const circumWater = 2 * Math.PI * ringRadiusWater;
  const pctWater = goalWater > 0 ? Math.min(100, (todayWater / goalWater) * 100) : 0;
  const offsetWater = circumWater - (pctWater / 100) * circumWater;

  // 7-Day Consistency Week Strip
  const daysOfWeek = ["M", "T", "W", "T", "F", "S", "S"];
  const currentDayIndex = (new Date().getDay() + 6) % 7; // Monday = 0

  return (
    <div className="mobile-page" style={{ paddingBottom: 120, background: "var(--color-bg)", minHeight: "100vh" }}>
      
      {/* ── 1. Top Bar / Athlete Identity ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, marginTop: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div 
            onClick={() => navigate("/you")}
            style={{
              width: 46, height: 46, borderRadius: "50%", overflow: 'hidden',
              cursor: 'pointer', background: 'rgba(255,255,255,0.08)',
              border: "2px solid var(--aura-accent)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}
          >
            {user?.avatar_url ? (
              <img src={resolveBackendUrl(user.avatar_url)} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--aura-accent)' }}>
                {greetingName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>
              Welcome, {greetingName}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "var(--aura-cyan)", fontWeight: 700 }}>
                <Zap size={12} /> {streak} Day Streak
              </span>
              <span>•</span>
              <span style={{ color: "var(--text-secondary)" }}>Athlete Hub</span>
            </div>
          </div>
        </div>
        
        <button 
          onClick={() => { setShowNotifications(true); fetchNotifications(); }}
          style={{
            width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center",
            justifyContent: "center", color: "var(--text-primary)", position: "relative",
            cursor: "pointer"
          }}
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <div style={{
              position: "absolute", top: -2, right: -2, background: "#EF4444", 
              color: "white", fontSize: 9, fontWeight: 900, width: 18, height: 18, 
              borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 0 2px var(--color-bg)",
              animation: "pulse 2s infinite"
            }}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </div>
          )}
        </button>
      </div>

      {/* ── 2. "Today's Action Plan" Hero Card ── */}
      <div 
        className="mobile-card"
        style={{
          padding: "18px 20px",
          marginBottom: 16,
          background: "linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(6, 182, 212, 0.08) 100%)",
          border: "1px solid rgba(139, 92, 246, 0.35)",
          borderRadius: 20,
          position: "relative",
          overflow: "hidden"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 900, color: "var(--aura-cyan)", textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 4 }}>
              <Target size={12} /> TODAY'S ACTION PLAN
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: "var(--text-primary)", margin: "4px 0 2px", letterSpacing: "-0.3px" }}>
              Upper Body Hypertrophy
            </h2>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              Push Focus • 5 Exercises • 45 min Target
            </div>
          </div>
          
          <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(139, 92, 246, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--aura-accent)" }}>
            <Dumbbell size={20} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button
            onClick={() => navigate("/workouts")}
            style={{
              flex: 1,
              padding: "12px 18px",
              borderRadius: 12,
              background: "var(--aura-accent, #8b5cf6)",
              color: "#ffffff",
              border: "none",
              fontWeight: 900,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(139, 92, 246, 0.4)"
            }}
          >
            <Play size={15} fill="#ffffff" /> START WORKOUT
          </button>
          
          <button
            onClick={() => navigate("/train")}
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid var(--color-border)",
              color: "var(--text-primary)",
              fontWeight: 800,
              fontSize: 12,
              cursor: "pointer"
            }}
          >
            Switch Split
          </button>
        </div>
      </div>

      {/* ── 3. 4-Button Quick Action Strip ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 18 }}>
        <button
          onClick={() => navigate("/workouts")}
          style={{
            background: "rgba(255,255,255,0.03)", border: "1px solid var(--color-border)",
            borderRadius: 14, padding: "12px 6px", display: "flex", flexDirection: "column",
            alignItems: "center", gap: 6, cursor: "pointer", color: "var(--text-primary)"
          }}
        >
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(139,92,246,0.15)", color: "var(--aura-accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Dumbbell size={16} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 800, textAlign: "center" }}>Workouts</span>
        </button>

        <button
          onClick={() => navigate("/nutrition")}
          style={{
            background: "rgba(255,255,255,0.03)", border: "1px solid var(--color-border)",
            borderRadius: 14, padding: "12px 6px", display: "flex", flexDirection: "column",
            alignItems: "center", gap: 6, cursor: "pointer", color: "var(--text-primary)"
          }}
        >
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(6,182,212,0.15)", color: "var(--aura-cyan)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Camera size={16} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 800, textAlign: "center" }}>Snap Meal</span>
        </button>

        <button
          onClick={handleQuickAddWater}
          disabled={loggingWater}
          style={{
            background: "rgba(255,255,255,0.03)", border: "1px solid var(--color-border)",
            borderRadius: 14, padding: "12px 6px", display: "flex", flexDirection: "column",
            alignItems: "center", gap: 6, cursor: "pointer", color: "var(--text-primary)"
          }}
        >
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(59,130,246,0.15)", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Droplets size={16} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 800, textAlign: "center" }}>+250ml Water</span>
        </button>

        <button
          onClick={() => navigate("/coach")}
          style={{
            background: "rgba(255,255,255,0.03)", border: "1px solid var(--color-border)",
            borderRadius: 14, padding: "12px 6px", display: "flex", flexDirection: "column",
            alignItems: "center", gap: 6, cursor: "pointer", color: "var(--text-primary)"
          }}
        >
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(236,72,153,0.15)", color: "#ec4899", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Brain size={16} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 800, textAlign: "center" }}>AI Coach</span>
        </button>
      </div>

      {/* ── 4. Triple Activity & Energy Rings (Zero-Flash & Instant) ── */}
      <div 
        className="mobile-card"
        onClick={() => navigate("/nutrition")}
        style={{
          padding: 18,
          marginBottom: 18,
          cursor: "pointer",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid var(--color-border)",
          position: "relative"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ padding: 6, borderRadius: 8, background: "rgba(236,72,153,0.15)", color: "#ec4899" }}>
              <Flame size={15} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 900, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Daily Energy & Triple Rings
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 800, color: "var(--aura-cyan)" }}>
            <span>Diary</span>
            <ChevronRight size={14} />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          {/* Triple Concentric Rings SVG */}
          <div style={{ position: "relative", width: 110, height: 110, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="110" height="110" style={{ transform: "rotate(-90deg)" }}>
              {/* Outer Ring: Calories */}
              <circle cx="55" cy="55" r={ringRadiusCal} stroke="rgba(255,255,255,0.06)" strokeWidth="7" fill="transparent" />
              <circle
                cx="55"
                cy="55"
                r={ringRadiusCal}
                stroke="#ec4899"
                strokeWidth="7"
                fill="transparent"
                strokeDasharray={circumCal}
                strokeDashoffset={offsetCal}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 0.6s ease" }}
              />

              {/* Middle Ring: Workout Effort */}
              <circle cx="55" cy="55" r={ringRadiusVol} stroke="rgba(255,255,255,0.06)" strokeWidth="6" fill="transparent" />
              <circle
                cx="55"
                cy="55"
                r={ringRadiusVol}
                stroke="var(--aura-cyan, #06b6d4)"
                strokeWidth="6"
                fill="transparent"
                strokeDasharray={circumVol}
                strokeDashoffset={offsetVol}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 0.6s ease" }}
              />

              {/* Inner Ring: Hydration */}
              <circle cx="55" cy="55" r={ringRadiusWater} stroke="rgba(255,255,255,0.06)" strokeWidth="5" fill="transparent" />
              <circle
                cx="55"
                cy="55"
                r={ringRadiusWater}
                stroke="#3b82f6"
                strokeWidth="5"
                fill="transparent"
                strokeDasharray={circumWater}
                strokeDashoffset={offsetWater}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 0.6s ease" }}
              />
            </svg>

            <div style={{ position: "absolute", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ fontSize: 15, fontWeight: 900, color: "var(--text-primary)", lineHeight: 1 }}>{remainingKcal}</span>
              <span style={{ fontSize: 8, fontWeight: 800, color: "var(--text-secondary)", marginTop: 2 }}>KCAL LEFT</span>
            </div>
          </div>

          {/* Macro Progress Bars + Hydration */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
            {/* Protein */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, marginBottom: 2 }}>
                <span style={{ color: "#ec4899" }}>Protein</span>
                <span style={{ color: "var(--text-secondary)" }}>{todayNutrition.protein} / {nutritionTargets.protein}g</span>
              </div>
              <div style={{ width: "100%", height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3 }}>
                <div style={{ width: `${Math.min(100, (todayNutrition.protein / (nutritionTargets.protein || 1)) * 100)}%`, height: "100%", background: "#ec4899", borderRadius: 3 }} />
              </div>
            </div>

            {/* Carbs */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, marginBottom: 2 }}>
                <span style={{ color: "var(--aura-cyan, #06b6d4)" }}>Carbs</span>
                <span style={{ color: "var(--text-secondary)" }}>{todayNutrition.carbs} / {nutritionTargets.carbs}g</span>
              </div>
              <div style={{ width: "100%", height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3 }}>
                <div style={{ width: `${Math.min(100, (todayNutrition.carbs / (nutritionTargets.carbs || 1)) * 100)}%`, height: "100%", background: "var(--aura-cyan, #06b6d4)", borderRadius: 3 }} />
              </div>
            </div>

            {/* Fats */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, marginBottom: 2 }}>
                <span style={{ color: "#f59e0b" }}>Fat</span>
                <span style={{ color: "var(--text-secondary)" }}>{todayNutrition.fat} / {nutritionTargets.fat}g</span>
              </div>
              <div style={{ width: "100%", height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3 }}>
                <div style={{ width: `${Math.min(100, (todayNutrition.fat / (nutritionTargets.fat || 1)) * 100)}%`, height: "100%", background: "#f59e0b", borderRadius: 3 }} />
              </div>
            </div>

            {/* Water */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, marginBottom: 2 }}>
                <span style={{ color: "#3b82f6" }}>Hydration</span>
                <span style={{ color: "var(--text-secondary)" }}>{todayWater} / {goalWater}ml</span>
              </div>
              <div style={{ width: "100%", height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3 }}>
                <div style={{ width: `${Math.min(100, (todayWater / (goalWater || 1)) * 100)}%`, height: "100%", background: "#3b82f6", borderRadius: 3 }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 5. 7-Day Consistency Week Strip ── */}
      <div className="mobile-card" style={{ padding: "14px 16px", marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 900, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            THIS WEEK'S CONSISTENCY
          </span>
          <span style={{ fontSize: 11, fontWeight: 800, color: "var(--aura-cyan)" }}>
            {sessions} Sessions Done
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
          {daysOfWeek.map((d, i) => {
            const isToday = i === currentDayIndex;
            const isPast = i < currentDayIndex;
            const hasWorkout = i === currentDayIndex || (isPast && (i % 2 === 0)); // dynamic indicator
            
            return (
              <div 
                key={i} 
                style={{ 
                  flex: 1, 
                  display: "flex", 
                  flexDirection: "column", 
                  alignItems: "center", 
                  gap: 6,
                  padding: "8px 0",
                  borderRadius: 12,
                  background: isToday ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.02)",
                  border: isToday ? "1px solid var(--aura-accent)" : "1px solid rgba(255,255,255,0.04)"
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 800, color: isToday ? "var(--aura-accent)" : "var(--text-secondary)" }}>
                  {d}
                </span>
                <div style={{
                  width: 22, height: 22, borderRadius: "50%",
                  background: hasWorkout ? "var(--aura-cyan)" : "rgba(255,255,255,0.05)",
                  color: hasWorkout ? "#000000" : "var(--text-secondary)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 900
                }}>
                  {hasWorkout ? <Check size={12} strokeWidth={3} /> : "—"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 6. Muscle Recovery & Readiness Card ── */}
      <div className="mobile-card" style={{ padding: "16px 18px", marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Shield size={16} color="var(--aura-cyan)" />
            <span style={{ fontSize: 12, fontWeight: 900, color: "var(--text-primary)", textTransform: "uppercase" }}>
              Muscle Readiness & Recovery
            </span>
          </div>
          <span style={{ fontSize: 11, fontWeight: 800, color: "#22c55e" }}>Optimal Status</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 700 }}>Chest & Shoulders</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 80, height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3 }}>
                <div style={{ width: "95%", height: "100%", background: "#22c55e", borderRadius: 3 }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#22c55e", minWidth: 32 }}>95%</span>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 700 }}>Back & Biceps</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 80, height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3 }}>
                <div style={{ width: "88%", height: "100%", background: "var(--aura-cyan)", borderRadius: 3 }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, color: "var(--aura-cyan)", minWidth: 32 }}>88%</span>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 700 }}>Legs & Core</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 80, height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3 }}>
                <div style={{ width: "72%", height: "100%", background: "#f59e0b", borderRadius: 3 }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#f59e0b", minWidth: 32 }}>72%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 7. Performance Snapshot 2x2 ── */}
      <div className="mobile-section-header">
        <h2 className="mobile-section-title">Performance Snapshot</h2>
        <button className="mobile-section-link" onClick={() => navigate("/workouts")}>Full Analytics</button>
      </div>
      
      <div className="mobile-card" style={{ marginBottom: 18 }}>
        <div className="mobile-grid-2x2">
          <div className="mobile-grid-item">
            <span className="mobile-grid-label">Total Volume</span>
            <span className="mobile-grid-val" style={{ color: "var(--aura-accent)" }}>{volumeLabel} kg</span>
          </div>
          <div className="mobile-grid-item">
            <span className="mobile-grid-label">Current Streak</span>
            <span className="mobile-grid-val" style={{ color: "var(--aura-cyan)" }}>{streak} Days</span>
          </div>
          <div className="mobile-grid-item">
            <span className="mobile-grid-label">Workouts Logged</span>
            <span className="mobile-grid-val">{sessions}</span>
          </div>
          <div className="mobile-grid-item">
            <span className="mobile-grid-label">Avg Session</span>
            <span className="mobile-grid-val">{avgDuration} min</span>
          </div>
        </div>
      </div>

      {/* ── 8. AI Coach Insight ── */}
      {dashboardData?.ai_insight && (
        <div className="mobile-card" style={{ padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 18, borderLeft: "3px solid var(--aura-accent)" }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(139,92,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--aura-accent)", flexShrink: 0 }}>
            <Brain size={18} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)", marginBottom: 2 }}>AI Training Insight</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 }}>{dashboardData.ai_insight}</div>
          </div>
        </div>
      )}

      {/* ── 9. Recent Workouts Feed ── */}
      <div className="mobile-section-header">
        <h2 className="mobile-section-title">Recent Workouts</h2>
        <button className="mobile-section-link" onClick={() => navigate("/workouts")}>View All</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {recentWorkouts.length > 0 ? (
          recentWorkouts.map((w, idx) => (
            <div 
              key={w.id || idx} 
              className="mobile-card" 
              onClick={() => navigate("/workouts")}
              style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(139,92,246,0.12)", color: "var(--aura-accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Dumbbell size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>{w.name || w.workout_name || "Strength Workout"}</div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
                    {w.session_date ? new Date(w.session_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : "Recent Session"}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: "var(--aura-cyan)" }}>
                  {w.volume ? `${fmt.int(w.volume)} kg` : (w.total_volume ? `${fmt.int(w.total_volume)} kg` : "Completed")}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 2 }}>
                  {w.duration_minutes ? `${w.duration_minutes}m` : "View details"}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div 
            className="mobile-card" 
            onClick={() => navigate("/workouts")}
            style={{ padding: "20px", textAlign: "center", cursor: "pointer", border: "1px dashed var(--color-border)" }}
          >
            <Dumbbell size={24} style={{ opacity: 0.3, marginBottom: 8, margin: "0 auto" }} />
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>No recent workouts logged</div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>Tap here to start your first workout today</div>
          </div>
        )}
      </div>

      {/* ── Notifications Bottom Sheet ── */}
      <MobileBottomSheet 
        isOpen={showNotifications} 
        onClose={() => setShowNotifications(false)} 
        title="Notifications"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingBottom: 24 }}>
          {notifications.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-secondary)", fontSize: 14 }}>
              No notifications yet. You're all caught up!
            </div>
          ) : (
            notifications.map(n => (
              <div 
                key={n.id}
                style={{
                  background: n.is_read ? "rgba(255,255,255,0.02)" : "rgba(139, 92, 246, 0.08)",
                  border: `1px solid ${n.is_read ? "var(--color-border)" : "rgba(139, 92, 246, 0.3)"}`,
                  borderRadius: 16,
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  position: "relative"
                }}
              >
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: n.type === 'workout_suggestion' ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.05)',
                    color: n.type === 'workout_suggestion' ? 'var(--aura-accent)' : 'var(--text-secondary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {n.type === 'workout_suggestion' ? <Dumbbell size={18} /> : <AlertCircle size={18} />}
                  </div>
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <div style={{ fontSize: 14, fontWeight: n.is_read ? 600 : 800, color: "var(--text-primary)", lineHeight: 1.2 }}>
                        {n.title}
                      </div>
                      <span style={{ fontSize: 10, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                        {new Date(n.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.4 }}>
                      {n.message}
                    </div>
                  </div>
                </div>

                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center",
                  borderTop: "1px solid rgba(255,255,255,0.05)",
                  paddingTop: 12,
                  marginTop: 4
                }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    {n.type === 'workout_suggestion' && n.data && (
                      <button 
                        onClick={() => handleAddWorkout(n)}
                        style={{
                          background: "var(--aura-accent)", color: "#fff", border: "none",
                          padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                          display: "flex", alignItems: "center", gap: 4, cursor: "pointer"
                        }}
                      >
                        <Plus size={12} strokeWidth={3} /> Save Template
                      </button>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 12 }}>
                    {!n.is_read && (
                      <button 
                        onClick={() => handleMarkRead(n.id)}
                        style={{ 
                          background: "rgba(255,255,255,0.05)", border: "none", 
                          color: "var(--aura-accent)", cursor: "pointer", 
                          padding: "6px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                          display: "flex", alignItems: "center", gap: 4
                        }}
                      >
                        <CheckCircle size={14} /> Mark Read
                      </button>
                    )}
                    <button 
                      onClick={() => handleDelete(n.id)}
                      style={{ 
                        background: "none", border: "none", 
                        color: "var(--text-secondary)", cursor: "pointer", 
                        padding: 6, display: "flex", alignItems: "center", justifyContent: "center"
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </MobileBottomSheet>

    </div>
  );
}
