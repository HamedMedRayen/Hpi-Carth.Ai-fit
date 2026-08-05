import React, { useState, useEffect } from "react";
import { 
  Apple, Settings, Brain, Search, Utensils, Zap, Clipboard, Copy, 
  Droplet, Sparkles, Camera, ChevronLeft, ChevronRight, Calendar,
  Clock, Trash2, Plus, Footprints, Flame, ShieldCheck, Edit3, BarChart2,
  Sunrise, Sun, Moon, BookOpen, LayoutDashboard, TrendingUp, Play, Square
} from "lucide-react";
import { api } from "../../utils/api";
import { getItem, setItem } from "../../utils/storage";

// Modals & Views
import FoodSearchModal from "../../components/nutrition/FoodSearchModal";
import QuickAddModal from "../../components/nutrition/QuickAddModal";
import RecipeBuilderModal from "../../components/nutrition/RecipeBuilderModal";
import CustomFoodModal from "../../components/nutrition/CustomFoodModal";
import NutritionCalculator from "../../components/nutrition/NutritionCalculator";
import MealScanModal from "../../components/nutrition/MealScanModal";
import EditGoalsModal from "../../components/nutrition/EditGoalsModal";
import WeeklyReportView from "../../components/nutrition/WeeklyReportView";
import CalorieRingHeader from "../../components/nutrition/CalorieRingHeader";

import "../styles/mobile.css";

const MEAL_CATEGORIES = [
  { id: "Breakfast", name: "Breakfast", icon: Sunrise, color: "#ff922b" },
  { id: "Lunch", name: "Lunch", icon: Sun, color: "#fcc419" },
  { id: "Dinner", name: "Dinner", icon: Moon, color: "#845ef7" },
  { id: "Snacks", name: "Snacks", icon: Apple, color: "#51cf66" }
];

const MacroRing = ({ value, target, color, label }) => {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{ position: "relative", width: 58, height: 58 }}>
        <svg width="58" height="58" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="29" cy="29" r={radius} stroke="rgba(255,255,255,0.06)" strokeWidth="4.5" fill="transparent" />
          <circle 
            cx="29" 
            cy="29" 
            r={radius} 
            stroke={color} 
            strokeWidth="4.5" 
            fill="transparent" 
            strokeDasharray={circumference} 
            strokeDashoffset={offset} 
            strokeLinecap="round" 
            style={{ 
              transition: "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
              filter: `drop-shadow(0 0 3px ${color}80)`
            }} 
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
          <span style={{ fontSize: 12, fontWeight: 900, color: "var(--text-primary)" }}>{Math.round(value)}</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>{label}</span>
        <span style={{ fontSize: 9, color: "var(--text-secondary)" }}>/ {target}g</span>
      </div>
    </div>
  );
};

export default function MobileNutrition() {
  // Mobile Sub-Navigation Tabs
  const [activeTab, setActiveTab] = useState("diary"); // 'diary', 'dashboard', 'report', 'ai_tools'

  // Date Navigation State
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Data States
  const [loading, setLoading] = useState(true);
  const [todayData, setTodayData] = useState({ meals: [], totals: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 } });
  const [history, setHistory] = useState([]);
  const [todayWater, setTodayWater] = useState(0);
  const [activeModal, setActiveModal] = useState(null); 
  const [targetCategory, setTargetCategory] = useState("Breakfast");
  const [showSettings, setShowSettings] = useState(false);
  const [scanInput, setScanInput] = useState("");
  const [scanningText, setScanningText] = useState(false);

  // Fasting Tracker State
  const [fasting, setFasting] = useState({
    active: false,
    startTime: null,
    targetHours: 16,
    windowLabel: "16:8 Fasting"
  });
  const [elapsedFastingSeconds, setElapsedFastingSeconds] = useState(0);

  const [targets, setTargets] = useState({
    calories: 2000,
    protein: 150,
    carbs: 220,
    fat: 65,
    water: 3000
  });

  const [exerciseBurned, setExerciseBurned] = useState(0);

  useEffect(() => {
    fetchTargets();
    loadFastingState();
  }, []);

  useEffect(() => {
    refreshData(selectedDate);
  }, [selectedDate]);

  // Fasting Timer Effect
  useEffect(() => {
    let interval = null;
    if (fasting.active && fasting.startTime) {
      const updateTimer = () => {
        const start = new Date(fasting.startTime).getTime();
        const now = new Date().getTime();
        const diffSecs = Math.max(0, Math.floor((now - start) / 1000));
        setElapsedFastingSeconds(diffSecs);
      };
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    } else {
      setElapsedFastingSeconds(0);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [fasting]);

  const loadFastingState = async () => {
    try {
      const saved = await getItem("aura_fasting_state");
      if (saved) setFasting(JSON.parse(saved));
    } catch (e) {
      console.error("Failed to load fasting state", e);
    }
  };

  const toggleFasting = async () => {
    let nextState;
    if (fasting.active) {
      nextState = { ...fasting, active: false, startTime: null };
    } else {
      nextState = { ...fasting, active: true, startTime: new Date().toISOString() };
    }
    setFasting(nextState);
    await setItem("aura_fasting_state", JSON.stringify(nextState));
  };

  const fetchTargets = async () => {
    try {
      const savedTargets = await getItem("aura_macro_targets");
      if (savedTargets) {
        setTargets(JSON.parse(savedTargets));
      } else {
        const latest = await api.getLatestNutritionTargets();
        if (latest) {
          setTargets({
            calories: latest.final_calories || 2000,
            protein: latest.final_protein || 150,
            carbs: latest.final_carbs || 220,
            fat: latest.final_fat || 65,
            water: 3000
          });
        }
      }
    } catch (e) {
      console.error("Failed to fetch targets", e);
    }
  };

  const refreshData = async (dateStr) => {
    setLoading(true);
    try {
      const [today, water, hist] = await Promise.all([
        api.getNutritionToday(dateStr),
        api.getWaterToday(),
        api.getNutritionHistory()
      ]);
      setTodayData(today || { meals: [], totals: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 } });
      setTodayWater(water?.amount_ml || 0);
      setHistory(hist || []);
    } catch (e) {
      console.error("Failed to fetch nutrition data", e);
    } finally {
      setLoading(false);
    }
  };

  const addWater = async (ml) => {
    setTodayWater(prev => prev + ml);
    try {
      await api.logWater(ml, "add");
    } catch (e) {
      refreshData(selectedDate);
    }
  };

  const handleDeleteLog = async (logId) => {
    try {
      await api.deleteNutritionLog(logId);
      refreshData(selectedDate);
    } catch (e) {
      console.error("Failed to delete log", e);
    }
  };

  const handleCopyYesterday = async () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    const yStr = d.toISOString().split('T')[0];
    
    try {
      await api.copyMeals(yStr, selectedDate);
      refreshData(selectedDate);
    } catch (e) {
      console.error("Failed to copy meals", e);
    }
  };

  const handleScan = async () => {
    if (!scanInput.trim()) return;
    const desc = scanInput;
    setScanInput("");
    setScanningText(true);
    try {
      await api.scanMeal(desc, targetCategory, selectedDate);
      refreshData(selectedDate);
    } catch (e) {
      console.error("AI scan failed", e);
    } finally {
      setScanningText(false);
    }
  };

  const changeDate = (days) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const openFoodSearch = (category = "Breakfast") => {
    setTargetCategory(category);
    setActiveModal('search');
  };

  const openQuickAdd = (category = "Breakfast") => {
    setTargetCategory(category);
    setActiveModal('quick');
  };

  const foodCalories = Math.round(todayData.totals.calories || 0);
  const remainingCalories = targets.calories - foodCalories + exerciseBurned;
  const isToday = selectedDate === new Date().toISOString().split("T")[0];

  const formatFastingTime = (totalSecs) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const mealsByCategory = MEAL_CATEGORIES.reduce((acc, cat) => {
    acc[cat.id] = (todayData.meals || []).filter(m => (m.meal_category || "Breakfast") === cat.id);
    return acc;
  }, {});

  return (
    <div className="mobile-page" style={{ paddingBottom: 120 }}>
      {/* ── Mobile Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, marginTop: 12 }}>
        <div>
          <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 2, textTransform: "uppercase" }}>MyFitnessPal Style</span>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>Nutrition Hub</h1>
        </div>
        <button onClick={() => setActiveModal('edit_goals')} style={{
          padding: "6px 10px", borderRadius: 10, background: "var(--mobile-card-bg)", border: "1px solid var(--mobile-card-border)",
          display: "flex", justifyContent: "center", alignItems: "center", cursor: "pointer", color: "var(--aura-cyan)", fontSize: 11, fontWeight: 800, gap: 4
        }}>
          <Edit3 size={14} /> Edit Goals
        </button>
      </div>

      {/* ── Sub-Navigation Segmented Bar with Icons ── */}
      <div style={{
        display: "flex", gap: 4, background: "rgba(255,255,255,0.03)", padding: 4, borderRadius: 14,
        border: "1px solid var(--mobile-card-border)", marginBottom: 16
      }}>
        <button onClick={() => setActiveTab("diary")} className={`mobile-tab-btn ${activeTab === "diary" ? "active" : ""}`}>
          <BookOpen size={13} /> Diary
        </button>
        <button onClick={() => setActiveTab("dashboard")} className={`mobile-tab-btn ${activeTab === "dashboard" ? "active" : ""}`}>
          <LayoutDashboard size={13} /> Summary
        </button>
        <button onClick={() => setActiveTab("report")} className={`mobile-tab-btn ${activeTab === "report" ? "active" : ""}`}>
          <BarChart2 size={13} /> Report
        </button>
        <button onClick={() => setActiveTab("ai_tools")} className={`mobile-tab-btn ${activeTab === "ai_tools" ? "active" : ""}`}>
          <Brain size={13} /> AI Tools
        </button>
      </div>

      {/* ── DATE NAVIGATION BAR ── */}
      <div className="mobile-card" style={{ padding: "10px 14px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={() => changeDate(-1)} style={{ background: "none", border: "none", color: "var(--aura-cyan)", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center" }}>
          <ChevronLeft size={16} /> Prev
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 800, fontSize: 13, color: "#fff" }}>
          <Calendar size={14} color="var(--aura-cyan)" />
          <span>{isToday ? `Today (${selectedDate})` : selectedDate}</span>
        </div>
        <button onClick={() => changeDate(1)} style={{ background: "none", border: "none", color: "var(--aura-cyan)", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center" }}>
          Next <ChevronRight size={16} />
        </button>
      </div>

      {/* ── TOP CALORIE REMAINING RING HEADER ── */}
      <CalorieRingHeader 
        targets={targets}
        foodCalories={foodCalories}
        exerciseBurned={exerciseBurned}
        remainingCalories={remainingCalories}
        todayData={todayData}
        onSetGoal={() => setActiveModal('calculator')}
        onEditGoals={() => setActiveModal('edit_goals')}
      />

      {/* ========================================================= */}
      {/* TAB 1: DIARY                                             */}
      {/* ========================================================= */}
      {activeTab === "diary" && (
        <div>
          {/* Fasting Card */}
          <div className="mobile-card" style={{ 
            padding: "12px 14px", marginBottom: 16, 
            background: "linear-gradient(135deg, rgba(186, 85, 211, 0.1) 0%, rgba(0, 242, 254, 0.05) 100%)",
            border: "1px solid rgba(186, 85, 211, 0.25)",
            display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(186, 85, 211, 0.2)", display: "flex", justifyContent: "center", alignItems: "center", color: "#ba55d3" }}>
                <Clock size={18} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>Fasting ({fasting.windowLabel})</div>
                <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>
                  {fasting.active ? `Elapsed: ${formatFastingTime(elapsedFastingSeconds)}` : "Start 16:8 fast"}
                </div>
              </div>
            </div>
            <button onClick={toggleFasting} style={{
              padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 800, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
              background: fasting.active ? "rgba(255, 77, 79, 0.2)" : "var(--aura-cyan)",
              color: fasting.active ? "#ff4d4f" : "#000"
            }}>
              {fasting.active ? <Square size={12} fill="#ff4d4f" /> : <Play size={12} fill="#000" />}
              {fasting.active ? "Stop" : "Start Fast"}
            </button>
          </div>

          {/* Meal Sub-Sections */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {MEAL_CATEGORIES.map(cat => {
              const IconComponent = cat.icon;
              const categoryMeals = mealsByCategory[cat.id] || [];
              const categoryKcal = Math.round(categoryMeals.reduce((sum, m) => sum + (m.calories || 0), 0));

              return (
                <div key={cat.id} className="mobile-card" style={{ padding: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: `${cat.color}20`, display: "flex", justifyContent: "center", alignItems: "center", color: cat.color }}>
                        <IconComponent size={15} />
                      </div>
                      <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: "#fff" }}>{cat.name}</h3>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 800, color: "var(--aura-cyan)" }}>{categoryKcal} kcal</span>
                  </div>

                  {categoryMeals.length === 0 ? (
                    <div style={{ fontSize: 11, color: "var(--text-secondary)", padding: "6px 0", fontStyle: "italic" }}>
                      No food logged yet.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                      {categoryMeals.map(item => (
                        <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "rgba(255,255,255,0.03)", borderRadius: 8 }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{item.meal_name}</div>
                            <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>
                              P:{Math.round(item.protein_g || 0)}g C:{Math.round(item.carbs_g || 0)}g F:{Math.round(item.fat_g || 0)}g
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 12, fontWeight: 800, color: "var(--aura-cyan)" }}>{Math.round(item.calories || 0)} kcal</span>
                            <button onClick={() => handleDeleteLog(item.id)} style={{ background: "none", border: "none", color: "#ff4d4f", cursor: "pointer", padding: 2 }}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <button onClick={() => openFoodSearch(cat.id)} style={{
                      flex: 1, padding: "8px", borderRadius: 8, border: "1px dashed var(--aura-cyan)",
                      background: "rgba(0, 242, 254, 0.05)", color: "var(--aura-cyan)", fontSize: 11, fontWeight: 800, cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: 4
                    }}>
                      <Plus size={14} /> ADD FOOD
                    </button>
                    <button onClick={() => openQuickAdd(cat.id)} style={{
                      padding: "8px 10px", borderRadius: 8, border: "1px solid var(--mobile-card-border)",
                      background: "rgba(255,255,255,0.04)", color: "var(--text-secondary)", fontSize: 11, fontWeight: 700, cursor: "pointer"
                    }}>
                      Quick Add
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 14, textAlign: "center" }}>
            <button onClick={handleCopyYesterday} style={{
              background: "none", border: "1px solid var(--mobile-card-border)", color: "var(--text-secondary)",
              padding: "8px 14px", borderRadius: 10, fontSize: 11, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4
            }}>
              <Copy size={12} /> Copy Meals From Yesterday
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: SUMMARY / DASHBOARD                                */}
      {/* ========================================================= */}
      {activeTab === "dashboard" && (
        <div>
          {/* Donut & Macro Rings */}
          <div className="mobile-card" style={{ padding: "16px", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>Target Macros</span>
              <button onClick={() => setActiveModal('edit_goals')} style={{ background: "none", border: "none", color: "var(--aura-cyan)", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 2 }}>
                <Edit3 size={12} /> Edit
              </button>
            </div>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 20 }}>
              <div style={{ flex: 1, display: "flex", justifyContent: "space-between" }}>
                <MacroRing value={todayData.totals.protein_g} target={targets.protein} color="var(--aura-pink)" label="Prot" />
                <MacroRing value={todayData.totals.carbs_g} target={targets.carbs} color="var(--aura-orange)" label="Carb" />
                <MacroRing value={todayData.totals.fat_g} target={targets.fat} color="var(--aura-purple)" label="Fat" />
              </div>
            </div>
          </div>

          {/* Water Intake Tracker */}
          <div className="mobile-card" style={{ padding: "14px", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Droplet size={18} color="var(--aura-cyan)" />
                <span style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>Water: {todayWater} / {targets.water} ml</span>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => addWater(250)} style={{ background: "rgba(0,242,254,0.1)", border: "1px solid rgba(0,242,254,0.2)", color: "var(--aura-cyan)", padding: "4px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700 }}>+250ml</button>
                <button onClick={() => addWater(500)} style={{ background: "rgba(0,242,254,0.1)", border: "1px solid rgba(0,242,254,0.2)", color: "var(--aura-cyan)", padding: "4px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700 }}>+500ml</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: WEEKLY REPORT & ARCHIVE                             */}
      {/* ========================================================= */}
      {activeTab === "report" && (
        <WeeklyReportView 
          targets={targets} 
          history={history} 
          onSelectDate={(dateStr) => {
            setSelectedDate(dateStr);
            setActiveTab("diary");
          }} 
        />
      )}

      {/* ========================================================= */}
      {/* TAB 4: AI & TOOLS                                         */}
      {/* ========================================================= */}
      {activeTab === "ai_tools" && (
        <div>
          {/* AI Vision Camera Scan Featured Card */}
          <div 
            className="mobile-card" 
            style={{ 
              padding: "16px", 
              marginBottom: 14, 
              background: "linear-gradient(135deg, rgba(0, 242, 254, 0.2) 0%, rgba(186, 85, 211, 0.25) 100%)",
              border: "1px solid rgba(0, 242, 254, 0.4)",
              borderRadius: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ 
                width: 44, 
                height: 44, 
                borderRadius: 12, 
                background: "linear-gradient(135deg, #00f2fe, #ba55d3)", 
                display: "flex", 
                justifyContent: "center", 
                alignItems: "center", 
                color: "#fff",
                boxShadow: "0 4px 12px rgba(0, 242, 254, 0.3)"
              }}>
                <Camera size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 900, margin: 0, color: "#fff" }}>AI Vision Meal Scan</h3>
                <p style={{ fontSize: 11, color: "var(--aura-cyan)", margin: "2px 0 0", fontWeight: 700 }}>
                  Snap photo for instant AI macro breakdown
                </p>
              </div>
            </div>
            <button 
              onClick={() => setActiveModal('vision')}
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                background: "#00f2fe",
                color: "#000",
                fontWeight: 900,
                fontSize: 12,
                border: "none",
                cursor: "pointer",
                whiteSpace: "nowrap"
              }}
            >
              Scan Photo
            </button>
          </div>

          {/* AI Assistant Natural Language with Obligatory Category selector */}
          <div className="mobile-card" style={{ padding: "14px", marginBottom: 14, border: "1px solid rgba(0, 242, 254, 0.25)", background: "rgba(13, 17, 23, 0.7)" }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: "#fff", margin: "0 0 8px", display: "flex", alignItems: "center", gap: 6 }}>
              <Brain size={16} color="#00f2fe" /> AI Nutrition Text Assistant
            </h3>
            
            {/* Obligatory Meal Category Selector */}
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: "var(--aura-cyan)", textTransform: "uppercase", marginBottom: 4, display: "block" }}>
                Select Meal Section (Obligatory)
              </label>
              <div style={{ display: "flex", gap: 4 }}>
                {["Breakfast", "Lunch", "Dinner", "Snacks"].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setTargetCategory(cat)}
                    style={{
                      flex: 1,
                      padding: "6px 2px",
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 800,
                      border: "none",
                      cursor: "pointer",
                      background: targetCategory === cat ? "var(--aura-cyan)" : "rgba(255,255,255,0.06)",
                      color: targetCategory === cat ? "#000" : "#aaa"
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 6 }}>
              <input 
                type="text"
                className="themed-input"
                placeholder={`Describe meal for ${targetCategory}...`}
                style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "8px 10px", color: "#fff", fontSize: 12, outline: "none" }}
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleScan(); }}
              />
              <button 
                onClick={handleScan}
                disabled={scanningText}
                style={{ background: "linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)", color: "#000", border: "none", borderRadius: 10, padding: "0 12px", fontWeight: 800, fontSize: 11, cursor: "pointer", opacity: scanningText ? 0.7 : 1 }}
              >
                <Sparkles size={12} /> {scanningText ? "Analyzing..." : "Ask AI"}
              </button>
            </div>
          </div>

          {/* Tools Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button className="mobile-quick-action" onClick={() => openFoodSearch('Breakfast')} style={{ margin: 0, width: "100%" }}>
              <div className="mobile-quick-action-icon"><Search size={16} /></div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span className="mobile-quick-action-label">Search</span>
                <span className="mobile-quick-action-sub">Food Database</span>
              </div>
            </button>
            <button className="mobile-quick-action" onClick={() => setActiveModal('vision')} style={{ margin: 0, width: "100%" }}>
              <div className="mobile-quick-action-icon"><Camera size={16} color="var(--aura-cyan)" /></div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span className="mobile-quick-action-label">Camera Scan</span>
                <span className="mobile-quick-action-sub">AI Vision Photo</span>
              </div>
            </button>
            <button className="mobile-quick-action" onClick={() => setActiveModal('recipe')} style={{ margin: 0, width: "100%" }}>
              <div className="mobile-quick-action-icon"><Utensils size={16} /></div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span className="mobile-quick-action-label">Recipe</span>
                <span className="mobile-quick-action-sub">Builder</span>
              </div>
            </button>
            <button className="mobile-quick-action" onClick={() => setActiveModal('custom')} style={{ margin: 0, width: "100%" }}>
              <div className="mobile-quick-action-icon"><Clipboard size={16} /></div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span className="mobile-quick-action-label">Custom</span>
                <span className="mobile-quick-action-sub">Food Creator</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {activeModal === 'search' && (
        <FoodSearchModal 
          initialCategory={targetCategory}
          targetDate={selectedDate}
          onClose={() => setActiveModal(null)} 
          onLog={() => refreshData(selectedDate)} 
          onSwitchToCustom={() => setActiveModal('custom')} 
        />
      )}
      {activeModal === 'quick' && (
        <QuickAddModal 
          initialCategory={targetCategory}
          targetDate={selectedDate}
          onClose={() => setActiveModal(null)} 
          onLog={() => refreshData(selectedDate)} 
        />
      )}
      {activeModal === 'recipe' && (
        <RecipeBuilderModal 
          onClose={() => setActiveModal(null)} 
          onSave={() => refreshData(selectedDate)} 
        />
      )}
      {activeModal === 'custom' && (
        <CustomFoodModal 
          onClose={() => setActiveModal(null)} 
          onSave={() => refreshData(selectedDate)} 
        />
      )}
      {activeModal === 'vision' && (
        <MealScanModal 
          initialCategory={targetCategory}
          targetDate={selectedDate}
          onClose={() => setActiveModal(null)} 
          onLog={() => refreshData(selectedDate)} 
        />
      )}
      {activeModal === 'calculator' && (
        <div 
          className="modal-overlay"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: 12
          }}
        >
          <div 
            className="card" 
            style={{ 
              maxWidth: 480, 
              width: "100%", 
              maxHeight: "90vh", 
              overflowY: "auto", 
              background: "#0d1117", 
              borderRadius: 20, 
              border: "1px solid var(--aura-cyan)", 
              padding: 16,
              boxShadow: "0 20px 50px rgba(0,0,0,0.8)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
              <button 
                onClick={() => setActiveModal(null)}
                style={{ background: "none", border: "none", color: "#aaa", fontSize: 18, cursor: "pointer", fontWeight: 800 }}
              >
                ✕
              </button>
            </div>
            <NutritionCalculator 
              onSaveSuccess={() => {
                fetchTargets();
                refreshData(selectedDate);
                setActiveModal(null);
              }} 
            />
          </div>
        </div>
      )}
      {activeModal === 'edit_goals' && (
        <EditGoalsModal 
          currentTargets={targets}
          onClose={() => setActiveModal(null)}
          onSave={(newTargets) => setTargets(newTargets)}
        />
      )}

      <style>{`
        .mobile-tab-btn {
          flex: 1;
          padding: 8px 4px;
          border-radius: 10px;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          font-weight: 700;
          font-size: 11px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }
        .mobile-tab-btn.active {
          background: var(--aura-cyan);
          color: #000;
          box-shadow: 0 2px 8px rgba(0,242,254,0.3);
        }
      `}</style>
    </div>
  );
}
