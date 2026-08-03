import React, { useState, useEffect } from "react";
import { Apple, Plus, History, Settings, Brain, Save, Search, Utensils, Zap, Clipboard, Copy } from "lucide-react";
import { useTheme } from "../utils/theme";
import Header from "../components/layout/Header";
import { api } from "../utils/api";
import { useToast } from "../components/Toast";
import { getItem, setItem } from "../utils/storage";

// Modals
import FoodSearchModal from "../components/nutrition/FoodSearchModal";
import QuickAddModal from "../components/nutrition/QuickAddModal";
import RecipeBuilderModal from "../components/nutrition/RecipeBuilderModal";
import CustomFoodModal from "../components/nutrition/CustomFoodModal";
import NutritionCalculator from "../components/nutrition/NutritionCalculator";
import MealScanModal from "../components/nutrition/MealScanModal";
import { Camera, Droplet, Sparkles } from "lucide-react";

import MacroRing from "../components/nutrition/MacroRing";

export default function Nutrition() {
  const { theme, previewTheme } = useTheme();
  const activeTheme = previewTheme || theme;
  
  const [loading, setLoading] = useState(true);
  const [todayData, setTodayData] = useState({ meals: [], totals: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 } });
  const [history, setHistory] = useState([]);
  const [todayWater, setTodayWater] = useState(0);

  // Modals state
  const [activeModal, setActiveModal] = useState(null); // 'search', 'quick', 'recipe', 'custom', 'vision'
  const [scanText, setScanText] = useState("");
  const [scanningText, setScanningText] = useState(false);
  const toast = useToast();

  const handleScanText = async () => {
    if (!scanText.trim()) return;
    setScanningText(true);
    try {
      await api.scanMeal(scanText.trim());
      setScanText("");
      if (toast?.success) toast.success("Meal analyzed & logged successfully!");
      refreshData();
    } catch (err) {
      console.error("Text scan error:", err);
      if (toast?.error) toast.error("Failed to analyze meal text.");
    } finally {
      setScanningText(false);
    }
  };

  // Settings / Macros
  const [showSettings, setShowSettings] = useState(false);
  const [generatingMacros, setGeneratingMacros] = useState(false);
  const [targets, setTargets] = useState({
    calories: 2500,
    protein: 160,
    carbs: 250,
    fat: 80,
    water: 3000
  });

  const [aiInputs, setAiInputs] = useState({
    age: "", weight: "", height: "", gender: "Male", activity: "Moderate", goal: "Maintain"
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
          water: 3000 // Water target is still local or default for now
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
      const [today, water, hist] = await Promise.all([
        api.getNutritionToday(),
        api.getWaterToday(),
        api.getNutritionHistory()
      ]);
      setTodayData(today);
      setTodayWater(water.amount_ml || 0);
      setHistory(hist);
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
      refreshData(); // Rollback
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
      toast.error("Failed to copy meals");
    }
  };

  const handleScan = async (description) => {
    if (!description.trim()) return;
    try {
      await api.scanMeal(description);
      refreshData();
    } catch (e) {
      toast.error("AI scan failed");
    }
  };

  const generateMacros = () => {
    if (!aiInputs.age || !aiInputs.weight || !aiInputs.height) return toast.error("Fill all fields");
    setGeneratingMacros(true);
    setTimeout(() => {
      const w = parseFloat(aiInputs.weight);
      const h = parseFloat(aiInputs.height);
      const a = parseInt(aiInputs.age);
      let bmr = (10 * w) + (6.25 * h) - (5 * a);
      bmr += aiInputs.gender === "Male" ? 5 : -161;
      let tdee = bmr * (aiInputs.activity === "Active" ? 1.55 : aiInputs.activity === "Moderate" ? 1.375 : 1.2);
      if (aiInputs.goal === "Cut") tdee -= 500; else if (aiInputs.goal === "Bulk") tdee += 300;
      const p = Math.round(w * 2.1);
      const f = Math.round((tdee * 0.28) / 9);
      const c = Math.round((tdee - (p * 4) - (f * 9)) / 4);
      setTargets({ calories: Math.round(tdee), protein: p, fat: f, carbs: c, water: 3000 });
      setGeneratingMacros(false);
    }, 1000);
  };

  const saveTargets = async () => {
    await setItem("aura_macro_targets", JSON.stringify(targets));
    setShowSettings(false);
  };

  const getPercentage = (current, target) => Math.min(100, Math.round((current / target) * 100)) || 0;

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 100 }}>
      <Header title="Nutrition Hub" subtitle="Smart food logging & performance fuel" />
      
      <div className="page-inner" style={{ maxWidth: 800 }}>
        
        {/* Top Actions Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
          <button onClick={() => setActiveModal('search')} className="action-card">
            <Search size={24} color="var(--aura-accent)" />
            <span>Search</span>
          </button>
          <button onClick={() => setActiveModal('quick')} className="action-card">
            <Zap size={24} color="var(--aura-accent3)" />
            <span>Quick Add</span>
          </button>
          <button onClick={() => setActiveModal('recipe')} className="action-card">
            <Utensils size={24} color="var(--aura-accent2)" />
            <span>Recipe</span>
          </button>
          <button onClick={() => setActiveModal('custom')} className="action-card">
            <Clipboard size={24} color="var(--aura-accent4)" />
            <span>Custom</span>
          </button>
          <button 
            onClick={() => setActiveModal('vision')} 
            className="action-card" 
            style={{ 
              background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.15) 0%, rgba(186, 85, 211, 0.2) 100%)',
              border: '1px solid rgba(0, 242, 254, 0.4)'
            }}
          >
            <Camera size={24} color="#00f2fe" />
            <span style={{ color: '#00f2fe', fontWeight: 800 }}>Vision Scan</span>
          </button>
        </div>

        {/* Summary Card */}
        <div className="card" style={{ padding: 24, marginBottom: 24, background: 'var(--color-bg-card)' }}>
          <div className="card-glow" />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Daily Progress</h2>
              <button onClick={() => setShowSettings(!showSettings)} style={{ background: 'none', border: 'none', color: 'var(--aura-accent)', cursor: 'pointer' }}>
                <Settings size={18} />
              </button>
            </div>

            {/* Macro Rings Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, textAlign: 'center' }}>
              <MacroRing value={todayData.totals.calories} target={targets.calories} color="var(--aura-accent)" label="Calories" unit="kcal" />
              <MacroRing value={todayData.totals.protein_g} target={targets.protein} color="var(--aura-accent2)" label="Protein" unit="g" />
              <MacroRing value={todayData.totals.carbs_g} target={targets.carbs} color="var(--aura-accent3)" label="Carbs" unit="g" />
              <MacroRing value={todayData.totals.fat_g} target={targets.fat} color="var(--aura-accent4)" label="Fat" unit="g" />
            </div>

            {/* Water Tracker */}
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(0, 242, 254, 0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#00f2fe' }}>
                  <Droplet size={20} />
                </div>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-3)' }}>Water Intake</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{todayWater} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--color-text-3)' }}>/ {targets.water} ml</span></div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handleAddWater(250)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>+250ml</button>
                <button onClick={() => handleAddWater(500)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>+500ml</button>
              </div>
            </div>
          </div>
        </div>

        {/* AI Assistant */}
        <div className="card" style={{ padding: 24, marginBottom: 24, border: '1px solid rgba(0, 242, 254, 0.25)', background: 'rgba(13, 17, 23, 0.7)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: '#fff' }}>
            <Brain size={18} color="#00f2fe" /> AI Nutrition Assistant
          </h2>
          <div style={{ display: 'flex', gap: 12 }}>
            <input 
              type="text" 
              className="themed-input" 
              placeholder="Describe a meal (e.g. 2 eggs and avocado toast)..." 
              style={{ flex: 1, background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff' }}
              value={scanText}
              onChange={(e) => setScanText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleScanText(); }}
            />
            <button 
              onClick={handleScanText}
              disabled={scanningText}
              className="themed-input" 
              style={{ 
                width: 'auto', 
                background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)', 
                color: '#000', 
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                border: 'none',
                opacity: scanningText ? 0.7 : 1
              }}
            >
              <Sparkles size={16} /> {scanningText ? "Analyzing..." : "Ask AI"}
            </button>
            <button 
              onClick={() => setActiveModal('vision')} 
              className="themed-input" 
              style={{ 
                width: 'auto', 
                background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.2) 0%, rgba(186, 85, 211, 0.3) 100%)', 
                border: '1px solid rgba(0, 242, 254, 0.5)',
                color: '#fff', 
                fontWeight: 700, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 6,
                cursor: 'pointer'
              }}
            >
              <Camera size={16} color="#00f2fe" /> AI Vision Scan
            </button>
          </div>
        </div>

        {/* Today's Log */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Today's Meals</h2>
            <button onClick={handleCopyYesterday} style={{ fontSize: 13, background: 'none', border: 'none', color: 'var(--color-text-3)', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <Copy size={14} /> Copy from yesterday
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {todayData.meals.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, background: 'var(--bg-card)', borderRadius: 16, border: '1px dashed var(--color-border)', color: 'var(--color-text-3)' }}>
                No meals logged today yet.
              </div>
            ) : (
              todayData.meals.map(m => (
                <div key={m.id} className="card" style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{m.meal_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>P: {Math.round(m.protein_g)}g • C: {Math.round(m.carbs_g)}g • F: {Math.round(m.fat_g)}g</div>
                  </div>
                  <div style={{ fontWeight: 800, color: 'var(--aura-accent)' }}>{Math.round(m.calories)} kcal</div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Modals */}
      {activeModal === 'search' && <FoodSearchModal onClose={() => setActiveModal(null)} onLog={refreshData} onSwitchToCustom={() => setActiveModal('custom')} />}
      {activeModal === 'quick' && <QuickAddModal onClose={() => setActiveModal(null)} onLog={refreshData} />}
      {activeModal === 'recipe' && <RecipeBuilderModal onClose={() => setActiveModal(null)} onSave={refreshData} />}
      {activeModal === 'custom' && <CustomFoodModal onClose={() => setActiveModal(null)} onSave={refreshData} />}
      {activeModal === 'vision' && <MealScanModal onClose={() => setActiveModal(null)} onLog={refreshData} />}

      <style>{`
        .action-card {
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          padding: 20px;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .action-card:hover {
          transform: translateY(-4px);
          border-color: var(--aura-accent);
          background: rgba(255,255,255,0.02);
        }
        .action-card span {
          font-size: 13px;
          font-weight: 700;
          color: var(--color-text);
        }
        .macro-row {
          width: 100%;
        }
        .macro-bar-bg {
          height: 6px;
          background: rgba(255,255,255,0.05);
          border-radius: 3px;
          overflow: hidden;
          margin-top: 4px;
        }
        .macro-bar-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.5s ease;
        }
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .modal-content {
          background: var(--color-bg-card);
          border: 1px solid var(--aura-accent);
          box-shadow: 0 0 30px rgba(0,0,0,0.5);
          padding: 24px;
        }
        .search-result-item:hover {
          background: rgba(255,255,255,0.03);
        }
        .macro-badge {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: rgba(255,255,255,0.05);
          padding: 8px;
          border-radius: 8px;
        }
      `}</style>
    </div>
  );
}

function MacroRow({ label, current, target, color }) {
  const pct = Math.min(100, Math.round((current / target) * 100)) || 0;
  return (
    <div className="macro-row">
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700 }}>
        <span style={{ color: 'var(--color-text-3)' }}>{label} ({pct}%)</span>
        <span>{Math.round(current)} / {target}g</span>
      </div>
      <div className="macro-bar-bg">
        <div className="macro-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
