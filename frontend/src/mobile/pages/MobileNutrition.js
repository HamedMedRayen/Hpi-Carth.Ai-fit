import React, { useState, useEffect } from "react";
import { 
  Apple, Settings, Brain, Search, Utensils, Zap, Clipboard, Copy, 
  Droplet, Sparkles 
} from "lucide-react";
import { api } from "../../utils/api";
import { getItem } from "../../utils/storage";

// Modals
import FoodSearchModal from "../../components/nutrition/FoodSearchModal";
import QuickAddModal from "../../components/nutrition/QuickAddModal";
import RecipeBuilderModal from "../../components/nutrition/RecipeBuilderModal";
import CustomFoodModal from "../../components/nutrition/CustomFoodModal";
import NutritionCalculator from "../../components/nutrition/NutritionCalculator";
import MealScanModal from "../../components/nutrition/MealScanModal";
import { Camera } from "lucide-react";

import "../styles/mobile.css";

const MacroRing = ({ value, target, color, label }) => {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{ position: "relative", width: 64, height: 64 }}>
        <svg width="64" height="64" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="32" cy="32" r={radius} stroke="rgba(255,255,255,0.06)" strokeWidth="5" fill="transparent" />
          <circle 
            cx="32" 
            cy="32" 
            r={radius} 
            stroke={color} 
            strokeWidth="5" 
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
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>{Math.round(value)}</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.2px" }}>{label}</span>
        <span style={{ fontSize: 9, color: "var(--text-secondary)", marginTop: 1 }}>/ {target}g</span>
      </div>
    </div>
  );
};

export default function MobileNutrition() {
  const [loading, setLoading] = useState(true);
  const [todayData, setTodayData] = useState({ meals: [], totals: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 } });
  const [todayWater, setTodayWater] = useState(0);
  const [activeModal, setActiveModal] = useState(null); 
  const [showSettings, setShowSettings] = useState(false);
  const [scanInput, setScanInput] = useState("");

  const [targets, setTargets] = useState({
    calories: 2500,
    protein: 160,
    carbs: 250,
    fat: 80,
    water: 3000
  });

  useEffect(() => {
    refreshData();
    fetchTargets();
  }, []);

  const fetchTargets = async () => {
    try {
      const latest = await api.getLatestNutritionTargets();
      if (latest) {
        setTargets({
          calories: latest.final_calories,
          protein: latest.final_protein,
          carbs: latest.final_carbs,
          fat: latest.final_fat,
          water: 3000
        });
      } else {
        const savedTargets = await getItem("aura_macro_targets");
        if (savedTargets) setTargets(JSON.parse(savedTargets));
      }
    } catch (e) {
      console.error("Failed to fetch targets", e);
    }
  };

  const refreshData = async () => {
    setLoading(true);
    try {
      const [today, water] = await Promise.all([
        api.getNutritionToday(),
        api.getWaterToday()
      ]);
      setTodayData(today);
      setTodayWater(water.amount_ml || 0);
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
      refreshData();
    }
  };

  const handleCopyYesterday = async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];
    
    try {
      await api.copyMeals(yStr, todayStr);
      refreshData();
    } catch (e) {
      console.error("Failed to copy meals", e);
    }
  };

  const handleScan = async () => {
    if (!scanInput.trim()) return;
    const desc = scanInput;
    setScanInput("");
    try {
      await api.scanMeal(desc);
      refreshData();
    } catch (e) {
      console.error("AI scan failed", e);
    }
  };

  const getPercentage = (current, target) => Math.min(100, Math.round((current / target) * 100)) || 0;

  return (
    <div className="mobile-page" style={{ paddingBottom: 120 }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, marginTop: 16 }}>
        <div>
          <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600, display: "block", marginBottom: 4 }}>Fuel & Recovery</span>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>Nutrition Hub</h1>
        </div>
        <button onClick={() => setShowSettings(!showSettings)} style={{
          width: 38, height: 38, borderRadius: 12, background: "var(--mobile-card-bg)", border: "1px solid var(--mobile-card-border)",
          display: "flex", justifyContent: "center", alignItems: "center", cursor: "pointer", color: "var(--text-primary)"
        }}>
          <Settings size={18} />
        </button>
      </div>

      {/* ── Settings Panel ── */}
      {showSettings && (
        <div style={{ marginBottom: 20 }}>
          <NutritionCalculator onSaveSuccess={() => {
            fetchTargets();
            setShowSettings(false);
          }} />
        </div>
      )}

      {/* ── Daily Summary Card ── */}
      <div className="mobile-card" style={{ padding: "20px 24px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 32, marginBottom: 24 }}>
          {/* Calorie Donut */}
          <div style={{ position: "relative", width: 110, height: 110 }}>
            <svg viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)", width: "100%", height: "100%" }}>
              <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
              <circle 
                cx="50" 
                cy="50" 
                r="44" 
                fill="none" 
                stroke="var(--aura-cyan)" 
                strokeWidth="7" 
                strokeDasharray={`${getPercentage(todayData.totals.calories, targets.calories) * 2.76} 276`} 
                strokeLinecap="round" 
                style={{ 
                  transition: "stroke-dasharray 1s ease",
                  filter: "drop-shadow(0 0 4px var(--aura-cyan-glow))"
                }} 
              />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: "var(--text-primary)", lineHeight: 1 }}>{Math.round(todayData.totals.calories)}</div>
              <div style={{ fontSize: 9, color: "var(--text-secondary)", fontWeight: 700, marginTop: 4 }}>/ {targets.calories} kcal</div>
            </div>
          </div>

          {/* Macro rings */}
          <div style={{ flex: 1, display: "flex", justifyContent: "space-between" }}>
            <MacroRing value={todayData.totals.protein_g} target={targets.protein} color="var(--aura-pink)" label="Prot" />
            <MacroRing value={todayData.totals.carbs_g} target={targets.carbs} color="var(--aura-orange)" label="Carb" />
            <MacroRing value={todayData.totals.fat_g} target={targets.fat} color="var(--aura-purple)" label="Fat" />
          </div>
        </div>

        {/* Water Wave Tracker Card */}
        <div style={{ 
          background: "rgba(0, 242, 254, 0.03)", 
          border: "1px solid rgba(0, 242, 254, 0.1)", 
          borderRadius: 16, 
          padding: "12px 16px",
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center" 
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ 
              width: 32, height: 32, borderRadius: 8, 
              background: "rgba(0, 242, 254, 0.08)", 
              color: "var(--aura-cyan)", 
              display: "flex", justifyContent: "center", alignItems: "center" 
            }}>
              <Droplet size={18} fill="var(--aura-cyan)" style={{ filter: "drop-shadow(0 0 2px var(--aura-cyan-glow))" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>Water Intake</span>
              <span style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 1 }}>
                {todayWater} / {targets.water} ml
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => addWater(250)} style={{
              background: "rgba(0, 242, 254, 0.1)", border: "1px solid rgba(0, 242, 254, 0.2)",
              color: "var(--aura-cyan)", padding: "6px 10px", borderRadius: 8,
              fontSize: 11, fontWeight: 700, cursor: "pointer"
            }}>+250ml</button>
            <button onClick={() => addWater(500)} style={{
              background: "rgba(0, 242, 254, 0.1)", border: "1px solid rgba(0, 242, 254, 0.2)",
              color: "var(--aura-cyan)", padding: "6px 10px", borderRadius: 8,
              fontSize: 11, fontWeight: 700, cursor: "pointer"
            }}>+500ml</button>
          </div>
        </div>
      </div>

      {/* ── Quick Actions Logging Grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
        <button 
          className="mobile-quick-action" 
          onClick={() => setActiveModal('vision')} 
          style={{ 
            margin: 0, width: '100%', gridColumn: "span 2",
            background: "linear-gradient(135deg, rgba(0, 242, 254, 0.2) 0%, rgba(186, 85, 211, 0.2) 100%)",
            border: "1px solid rgba(0, 242, 254, 0.4)", padding: "14px 18px", borderRadius: 16,
            display: "flex", alignItems: "center", gap: 12
          }}
        >
          <div className="mobile-quick-action-icon" style={{ background: "linear-gradient(135deg, #00f2fe, #ba55d3)", color: "#fff", width: 40, height: 40, borderRadius: 12, display: "flex", justifyContent: "center", alignItems: "center" }}>
            <Camera size={20} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", textAlign: "left" }}>
            <span className="mobile-quick-action-label" style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>AI Vision Camera Scan</span>
            <span className="mobile-quick-action-sub" style={{ color: "var(--aura-cyan)", fontSize: 11, fontWeight: 600 }}>Snap photo for instant macros & breakdown</span>
          </div>
        </button>

        <button className="mobile-quick-action action-workout" onClick={() => setActiveModal('search')} style={{ margin: 0, width: '100%' }}>
          <div className="mobile-quick-action-icon">
            <Search size={18} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span className="mobile-quick-action-label">Search</span>
            <span className="mobile-quick-action-sub">Food DB</span>
          </div>
        </button>

        <button className="mobile-quick-action action-meal" onClick={() => setActiveModal('quick')} style={{ margin: 0, width: '100%' }}>
          <div className="mobile-quick-action-icon">
            <Zap size={18} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span className="mobile-quick-action-label">Quick</span>
            <span className="mobile-quick-action-sub">Macros</span>
          </div>
        </button>

        <button className="mobile-quick-action action-chat" onClick={() => setActiveModal('recipe')} style={{ margin: 0, width: '100%' }}>
          <div className="mobile-quick-action-icon">
            <Utensils size={18} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span className="mobile-quick-action-label">Recipe</span>
            <span className="mobile-quick-action-sub">Builder</span>
          </div>
        </button>

        <button className="mobile-quick-action action-challenges" onClick={() => setActiveModal('custom')} style={{ margin: 0, width: '100%' }}>
          <div className="mobile-quick-action-icon">
            <Clipboard size={18} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span className="mobile-quick-action-label">Custom</span>
            <span className="mobile-quick-action-sub">Food</span>
          </div>
        </button>
      </div>

      {/* ── AI Nutrition Scanner ── */}
      <div className="mobile-card" style={{ padding: "16px 20px", marginBottom: 24 }}>
        <h3 style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 12px", display: "flex", alignItems: "center", gap: 6 }}>
          <Brain size={15} color="var(--aura-pink)" /> AI Nutrition Assistant
        </h3>
        <div style={{ display: "flex", gap: 8 }}>
          <input 
            type="text"
            className="themed-input"
            placeholder="Describe your meal..."
            style={{ 
              flex: 1, 
              background: "rgba(255,255,255,0.03)", 
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12, 
              padding: "10px 14px", 
              color: "var(--text-primary)", 
              fontSize: 13,
              outline: "none"
            }}
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleScan(); }}
          />
          <button 
            onClick={handleScan}
            style={{ 
              background: "var(--aura-cyan)", 
              color: "#000", 
              border: "none", 
              borderRadius: 12, 
              padding: "0 12px", 
              fontWeight: 700, 
              fontSize: 12, 
              display: "flex", 
              alignItems: "center", 
              gap: 4,
              cursor: "pointer"
            }}
          >
            <Sparkles size={13} /> Ask
          </button>
          <button 
            onClick={() => setActiveModal('vision')}
            style={{ 
              background: "linear-gradient(135deg, #00f2fe 0%, #ba55d3 100%)", 
              color: "#fff", 
              border: "none", 
              borderRadius: 12, 
              padding: "0 12px", 
              fontWeight: 700, 
              fontSize: 12, 
              display: "flex", 
              alignItems: "center", 
              gap: 4,
              cursor: "pointer"
            }}
          >
            <Camera size={13} /> Photo
          </button>
        </div>
      </div>

      {/* ── Today's Meals ── */}
      <div className="mobile-section-header">
        <h2 className="mobile-section-title">Today's Meals</h2>
        <button className="mobile-section-link" onClick={handleCopyYesterday}>
          <Copy size={12} style={{ display: "inline", marginRight: 4 }} /> Copy Prev
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {todayData.meals.length === 0 ? (
          <div className="mobile-card" style={{ 
            textAlign: "center", padding: "32px 16px", background: "transparent", 
            borderStyle: "dashed", borderColor: "var(--mobile-card-border)" 
          }}>
            <Apple size={22} style={{ opacity: 0.15, marginBottom: 8, color: "var(--text-primary)" }} />
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>No meals logged today yet</div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>Tap an option above or type to scan.</div>
          </div>
        ) : (
          todayData.meals.map(m => (
            <div key={m.id} className="mobile-list-item" style={{ marginBottom: 8 }}>
              <div className="mobile-list-icon">
                <Apple size={20} color="var(--aura-green)" />
              </div>
              <div className="mobile-list-content">
                <div className="mobile-list-title">{m.meal_name}</div>
                <div className="mobile-list-subtitle">
                  P: {Math.round(m.protein_g)}g • C: {Math.round(m.carbs_g)}g • F: {Math.round(m.fat_g)}g
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="mobile-list-value" style={{ color: "var(--aura-cyan)" }}>{Math.round(m.calories)} kcal</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modals */}
      {activeModal === 'search' && <FoodSearchModal onClose={() => setActiveModal(null)} onLog={refreshData} onSwitchToCustom={() => setActiveModal('custom')} />}
      {activeModal === 'quick' && <QuickAddModal onClose={() => setActiveModal(null)} onLog={refreshData} />}
      {activeModal === 'recipe' && <RecipeBuilderModal onClose={() => setActiveModal(null)} onSave={refreshData} />}
      {activeModal === 'custom' && <CustomFoodModal onClose={() => setActiveModal(null)} onSave={refreshData} />}
      {activeModal === 'vision' && <MealScanModal onClose={() => setActiveModal(null)} onLog={refreshData} />}
    </div>
  );
}
