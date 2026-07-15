import React, { useState, useEffect } from "react";
import {
  RotateCcw,
  Save,
  User,
  Activity,
  Target,
  CheckCircle2,
  Info,
  Scale,
  Footprints,
  Briefcase,
  Flame,
  ArrowRight,
  TrendingUp,
  Dumbbell
} from "lucide-react";
import { api } from "../../utils/api";
import { useToast } from "../Toast";

export default function NutritionCalculator({ onSaveSuccess }) {
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [inputs, setInputs] = useState({
    weight: "",
    height: "",
    age: "",
    sex: "M",
    steps: 7500,
    training_sessions: 3,
    training_intensity: "moderate",
    work_type: "desk",
    goal: "maintenance",
    pace: "moderate",
    diet_style: "balanced"
  });

  const [results, setResults] = useState(null);
  const [strategy, setStrategy] = useState('Maintain');
  const [consumed, setConsumed] = useState({
    protein: 49,
    carbs: 95,
    fat: 26,
    water: 5
  });

  const [displayCals, setDisplayCals] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  const handleInputChange = (name, value) => {
    setInputs(prev => ({ ...prev, [name]: value }));
  };

  const calculate = async () => {
    setLoading(true);
    try {
      const data = await api.calculateNutritionTargets(inputs);
      setResults(data);
      setStep(2); 
    } catch (e) {
      console.error("Calculation failed", e);
      toast.error("Failed to calculate. Please check your inputs.");
    } finally {
      setLoading(false);
    }
  };

  const getStrategyBase = () => {
    const base = results ? results.target_calories : 2232;
    if (strategy === 'Cut') return base - 500;
    if (strategy === 'Bulk') return base + 300;
    return base;
  };

  const targets = {
    calories: getStrategyBase(),
    protein: results ? results.protein_g : 140,
    carbs: results ? results.carbs_g : 250,
    fat: results ? results.fat_g : 70,
    water: 8
  };

  const consumedCals = (consumed.protein * 4) + (consumed.carbs * 4) + (consumed.fat * 9);
  const remainingCals = Math.max(0, targets.calories - consumedCals);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    const duration = step === 2 && displayCals === 0 ? 1000 : 400;
    const start = displayCals;
    const end = remainingCals;
    let startTime = null;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setDisplayCals(Math.floor(progress * (end - start) + start));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [strategy, remainingCals, step]);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Align with backend NutritionTargetSaveRequest schema
      const payload = {
        suggested: {
          calories: results?.target_calories || 2232,
          protein: results?.protein_g || 140,
          carbs: results?.carbs_g || 250,
          fat: results?.fat_g || 70
        },
        final: {
          calories: targets.calories,
          protein: targets.protein,
          carbs: targets.carbs,
          fat: targets.fat
        },
        goal: strategy.toLowerCase(),
        pace: inputs.pace || "moderate",
        diet_style: inputs.diet_style || "balanced",
        maintenance_calories: results?.maintenance_calories || 2232,
        expected_weekly_change: results?.expected_weekly_change || 0
      };

      await api.saveNutritionTargets(payload);
      
      if (onSaveSuccess) onSaveSuccess();
      toast.success("Targets applied and saved successfully!");
    } catch (e) {
      console.error("Save failed", e);
      toast.error("Failed to save targets. Please check server connection.");
    } finally {
      setLoading(false);
    }
  };

  const renderInputSection = () => (
    <div className="calc-inputs-container">
      <div className="inputs-intro">
        <h2 className="premium-title">Nutrition Blueprint</h2>
        <p className="strategy-subtitle">Crafting your personalized metabolic roadmap.</p>
      </div>

      <div className="calc-group-modern">
        <div className="group-header">
          <div className="group-icon"><User size={18} /></div>
          <div className="group-info">
            <h3 className="group-title">Body Profile</h3>
            <p className="group-subtitle">Essential metrics for accurate calculation</p>
          </div>
        </div>
        <div className="calc-grid-refined">
          <div className="input-wrap-premium">
            <label>Weight (kg)</label>
            <input type="number" value={inputs.weight} onChange={e => handleInputChange('weight', e.target.value)} placeholder="0.0" />
          </div>
          <div className="input-wrap-premium">
            <label>Height (cm)</label>
            <input type="number" value={inputs.height} onChange={e => handleInputChange('height', e.target.value)} placeholder="0" />
          </div>
          <div className="input-wrap-premium">
            <label>Age (yrs)</label>
            <input type="number" value={inputs.age} onChange={e => handleInputChange('age', e.target.value)} placeholder="0" />
          </div>
          <div className="input-wrap-premium">
            <label>Sex</label>
            <div className="premium-toggle-group">
              <button className={inputs.sex === 'M' ? 'active' : ''} onClick={() => handleInputChange('sex', 'M')}>Male</button>
              <button className={inputs.sex === 'F' ? 'active' : ''} onClick={() => handleInputChange('sex', 'F')}>Female</button>
            </div>
          </div>
        </div>
      </div>

      <div className="calc-group-modern">
        <div className="group-header">
          <div className="group-icon"><Activity size={18} /></div>
          <div className="group-info">
            <h3 className="group-title">Activity & Lifestyle</h3>
            <p className="group-subtitle">Define your daily energy expenditure</p>
          </div>
        </div>
        <div className="calc-grid-refined">
          <div className="input-wrap-premium">
            <label><Footprints size={14} /> Steps/Day</label>
            <input type="number" value={inputs.steps} onChange={e => handleInputChange('steps', e.target.value)} />
          </div>
          <div className="input-wrap-premium">
            <label><Dumbbell size={14} /> Workouts/Week</label>
            <input type="number" value={inputs.training_sessions} onChange={e => handleInputChange('training_sessions', e.target.value)} />
          </div>
          <div className="input-wrap-premium">
            <label><Activity size={14} /> Intensity</label>
            <select value={inputs.training_intensity} onChange={e => handleInputChange('training_intensity', e.target.value)}>
              <option value="low">Low (Technical)</option>
              <option value="moderate">Moderate (Standard)</option>
              <option value="high">High (Maximum)</option>
            </select>
          </div>
          <div className="input-wrap-premium">
            <label><Briefcase size={14} /> Daily Work</label>
            <select value={inputs.work_type} onChange={e => handleInputChange('work_type', e.target.value)}>
              <option value="desk">Desk / Sedentary</option>
              <option value="standing">Standing / Active</option>
              <option value="physical">Heavy Physical</option>
            </select>
          </div>
        </div>
      </div>

      <div className="calc-group-modern highlight">
        <div className="group-header">
          <div className="group-icon"><Target size={18} /></div>
          <div className="group-info">
            <h3 className="group-title">Vision & Strategy</h3>
            <p className="group-subtitle">Select your primary objective</p>
          </div>
        </div>
        <div className="calc-grid-refined three-cols">
          <div className="input-wrap-premium">
            <label>Outcome Goal</label>
            <select value={inputs.goal} onChange={e => handleInputChange('goal', e.target.value)}>
              <option value="fat_loss">Fat Loss</option>
              <option value="maintenance">Maintenance</option>
              <option value="muscle_gain">Muscle Gain</option>
            </select>
          </div>
          <div className="input-wrap-premium">
            <label>Progression Pace</label>
            <select value={inputs.pace} onChange={e => handleInputChange('pace', e.target.value)}>
              <option value="slow">Slow & Sustainable</option>
              <option value="moderate">Moderate</option>
              <option value="aggressive">Aggressive</option>
            </select>
          </div>
          <div className="input-wrap-premium">
            <label>Dietary Style</label>
            <select value={inputs.diet_style} onChange={e => handleInputChange('diet_style', e.target.value)}>
              <option value="balanced">Balanced</option>
              <option value="low_carb">Low Carb</option>
              <option value="high_protein">High Protein</option>
              <option value="low_fat">Low Fat</option>
            </select>
          </div>
        </div>
      </div>

      <button className="calculate-btn-premium" onClick={calculate} disabled={loading || !inputs.weight || !inputs.height || !inputs.age}>
        {loading ? <span className="loader"></span> : <><span>Generate Recommendations</span><ArrowRight size={20} /></>}
      </button>
    </div>
  );

  const renderResultsSection = () => {
    const radius = 110;
    const circum = 2 * Math.PI * radius;
    
    const slices = {
      protein: (targets.protein * 4 / targets.calories) * 0.9,
      carbs: (targets.carbs * 4 / targets.calories) * 0.9,
      fat: (targets.fat * 9 / targets.calories) * 0.9,
      water: 0.1 
    };

    const completion = {
      protein: Math.min(consumed.protein / targets.protein, 1),
      carbs: Math.min(consumed.carbs / targets.carbs, 1),
      fat: Math.min(consumed.fat / targets.fat, 1),
      water: Math.min(consumed.water / targets.water, 1)
    };

    const arcLengths = {
      protein: slices.protein * completion.protein * circum,
      carbs: slices.carbs * completion.carbs * circum,
      fat: slices.fat * completion.fat * circum,
      water: slices.water * completion.water * circum
    };

    const rotations = {
      protein: -90,
      carbs: -90 + (slices.protein * 360),
      fat: -90 + ((slices.protein + slices.carbs) * 360),
      water: -90 + ((slices.protein + slices.carbs + slices.fat) * 360)
    };

    return (
      <div className="strategy-display-container">
        <div className="strategy-header-row">
          <div className="header-text">
             <h2 className="strategy-main-title">Daily Intake Strategy</h2>
             <p className="strategy-subtitle-muted">Macro completion & caloric targets</p>
          </div>
          <div className="strategy-toggles">
            {['Maintain', 'Cut', 'Bulk'].map(mode => (
              <button 
                key={mode}
                className={`strategy-pill ${strategy === mode ? 'active' : ''}`}
                onClick={() => setStrategy(mode)}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div className="ring-center-layout">
          <div className="progress-ring-wrapper">
            <svg width="240" height="240" viewBox="0 0 240 240" className="animated-ring">
              <circle cx="120" cy="120" r={radius} className="ring-track" strokeWidth="14" fill="none" />
              <circle cx="120" cy="120" r={radius} stroke="var(--color-protein)" strokeWidth="16" strokeDasharray={`${arcLengths.protein} ${circum}`} strokeLinecap="round" fill="none" style={{ transform: `rotate(${rotations.protein}deg)`, transformOrigin: 'center', transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }} />
              <circle cx="120" cy="120" r={radius} stroke="var(--color-carbs)" strokeWidth="16" strokeDasharray={`${arcLengths.carbs} ${circum}`} strokeLinecap="round" fill="none" style={{ transform: `rotate(${rotations.carbs}deg)`, transformOrigin: 'center', transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }} />
              <circle cx="120" cy="120" r={radius} stroke="var(--color-fats)" strokeWidth="16" strokeDasharray={`${arcLengths.fat} ${circum}`} strokeLinecap="round" fill="none" style={{ transform: `rotate(${rotations.fat}deg)`, transformOrigin: 'center', transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }} />
              <circle cx="120" cy="120" r={radius} stroke="var(--color-water)" strokeWidth="16" strokeDasharray={`${arcLengths.water} ${circum}`} strokeLinecap="round" fill="none" style={{ transform: `rotate(${rotations.water}deg)`, transformOrigin: 'center', transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }} />
            </svg>
            
            <div className="ring-content">
              <span className="label-muted">Remaining</span>
              <div className="remaining-val">{displayCals.toLocaleString()}</div>
              <span className="label-muted">of {targets.calories.toLocaleString()} kcal</span>
            </div>
          </div>
        </div>

        <div className="macro-pills-row">
          <div className="macro-pill-mini">
            <span className="dot" style={{ background: 'var(--color-protein)' }}></span>
            <span className="name">Protein</span>
            <span className="vals">{consumed.protein}/{targets.protein}g</span>
          </div>
          <div className="macro-pill-mini">
            <span className="dot" style={{ background: 'var(--color-carbs)' }}></span>
            <span className="name">Carbs</span>
            <span className="vals">{consumed.carbs}/{targets.carbs}g</span>
          </div>
          <div className="macro-pill-mini">
            <span className="dot" style={{ background: 'var(--color-fats)' }}></span>
            <span className="name">Fats</span>
            <span className="vals">{consumed.fat}/{targets.fat}g</span>
          </div>
          <div className="macro-pill-mini">
            <span className="dot" style={{ background: 'var(--color-water)' }}></span>
            <span className="name">Water</span>
            <span className="vals">{consumed.water}/{targets.water}</span>
          </div>
        </div>

        <div className="results-actions">
           <button className="save-strategy-btn" onClick={handleSave} disabled={loading}>
             {loading ? <span className="loader"></span> : <><Save size={20} /><span>Apply Strategy</span></>}
           </button>
           <button className="edit-inputs-btn-mini" onClick={() => setStep(1)}><RotateCcw size={14} /> Recalculate</button>
        </div>
      </div>
    );
  };

  return (
    <div className="nutrition-calculator-wrapper glass-premium">
      {step === 1 ? renderInputSection() : renderResultsSection()}
      <style jsx>{`
        .nutrition-calculator-wrapper { width: 100%; border-radius: 40px; overflow: hidden; background: var(--bg-glass, rgba(10, 15, 25, 0.7)); backdrop-filter: blur(30px); position: relative; }
        .calc-inputs-container, .strategy-display-container { padding: 32px; animation: slideUpFade 0.7s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes slideUpFade { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }

        .inputs-intro { margin-bottom: 24px; }
        .premium-title { margin: 0; font-size: 24px; font-weight: 950; letter-spacing: -0.04em; background: linear-gradient(135deg, var(--color-text), var(--color-text-3)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .strategy-subtitle { margin: 6px 0 0; font-size: 14px; color: var(--color-text-3); font-weight: 500; opacity: 0.8; }
        .strategy-subtitle-muted { margin: 4px 0 0; font-size: 13px; color: var(--color-text-3); opacity: 0.6; }

        .calc-group-modern { background: rgba(255, 255, 255, 0.015); border-radius: 24px; padding: 20px; margin-bottom: 16px; border: 1px solid rgba(255, 255, 255, 0.03); }
        .calc-group-modern.highlight { background: radial-gradient(circle at top right, rgba(var(--aura-accent-rgb), 0.06), transparent 70%), rgba(255, 255, 255, 0.015); }
        .group-header { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; }
        .group-icon { width: 36px; height: 36px; background: rgba(var(--aura-accent-rgb), 0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--aura-accent); }
        .group-title { font-size: 15px; font-weight: 900; color: var(--color-text); margin: 0; }
        .group-subtitle { font-size: 12px; color: var(--color-text-3); margin: 2px 0 0; opacity: 0.7; }

        .calc-grid-refined { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; width: 100%; }
        .calc-grid-refined.three-cols { grid-template-columns: repeat(3, 1fr); }
        .input-wrap-premium { display: flex; flex-direction: column; gap: 8px; width: 100%; }
        .input-wrap-premium label { 
          font-size: 9px; 
          font-weight: 800; 
          color: var(--color-text-3); 
          text-transform: uppercase; 
          letter-spacing: 0.1em; 
          padding-left: 2px;
          display: flex;
          align-items: center;
          gap: 6px;
          min-height: 14px;
        }
        .input-wrap-premium input, .input-wrap-premium select { background: rgba(0, 0, 0, 0.2); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 12px 16px; color: var(--color-text); font-size: 14px; font-weight: 600; width: 100%; transition: all 0.3s ease; }
        .input-wrap-premium input:focus { box-shadow: 0 0 0 3px rgba(var(--aura-accent-rgb), 0.15); border-color: rgba(var(--aura-accent-rgb), 0.3); outline: none; transform: translateY(-1px); }

        .premium-toggle-group { display: flex; background: rgba(0, 0, 0, 0.2); border-radius: 12px; padding: 4px; gap: 4px; }
        .premium-toggle-group button { flex: 1; background: none; border: none; padding: 10px; font-size: 12px; font-weight: 800; color: var(--color-text-3); cursor: pointer; border-radius: 10px; }
        .premium-toggle-group button.active { background: var(--aura-accent); color: white; box-shadow: 0 4px 12px rgba(var(--aura-accent-rgb), 0.2); }

        .calculate-btn-premium { width: 100%; background: linear-gradient(135deg, var(--aura-accent), var(--aura-accent2)); color: white; border: none; border-radius: 20px; padding: 20px; font-size: 16px; font-weight: 900; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 24px; transition: all 0.4s ease; }
        .calculate-btn-premium:hover { transform: translateY(-3px); box-shadow: 0 15px 30px -10px rgba(var(--aura-accent-rgb), 0.4); }

        .strategy-header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
        .strategy-main-title { margin: 0; font-size: 20px; font-weight: 900; color: var(--color-text); letter-spacing: -0.02em; }
        .strategy-toggles { display: flex; background: rgba(255, 255, 255, 0.03); padding: 4px; border-radius: 99px; gap: 4px; }
        .strategy-pill { background: transparent; border: none; padding: 8px 18px; border-radius: 99px; font-size: 12px; font-weight: 700; color: var(--color-text-3); cursor: pointer; transition: all 0.3s ease; }
        .strategy-pill.active { background: var(--aura-accent); color: white; box-shadow: 0 4px 12px rgba(var(--aura-accent-rgb), 0.3); }

        .ring-center-layout { display: flex; justify-content: center; margin-bottom: 32px; }
        .progress-ring-wrapper { position: relative; width: 240px; height: 240px; }
        .ring-track { stroke: var(--color-ring-track); }
        .ring-content { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; }
        .label-muted { font-size: 13px; color: var(--color-text-3); font-weight: 600; opacity: 0.6; }
        .remaining-val { font-size: 52px; font-weight: 950; color: var(--color-text); line-height: 1; margin: 4px 0; letter-spacing: -0.05em; text-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        
        .animated-ring circle:not(.ring-track) {
          filter: drop-shadow(0 0 4px rgba(0,0,0,0.05));
        }

        .macro-pills-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 32px; }
        .macro-pill-mini { background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); padding: 14px; border-radius: 18px; display: flex; align-items: center; gap: 10px; }
        .dot { width: 10px; height: 10px; border-radius: 50%; }
        .name { font-size: 13px; font-weight: 700; color: var(--color-text-2); }
        .vals { margin-left: auto; font-size: 14px; font-weight: 800; color: var(--color-text); }

        .results-actions { display: flex; flex-direction: column; gap: 12px; align-items: center; }
        .save-strategy-btn { width: 100%; background: linear-gradient(135deg, var(--aura-accent), var(--aura-accent2)); color: white; border: none; border-radius: 20px; padding: 18px; font-size: 16px; font-weight: 950; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; transition: all 0.4s ease; box-shadow: 0 15px 30px -10px rgba(var(--aura-accent-rgb), 0.4); }
        .save-strategy-btn:hover { transform: translateY(-3px); box-shadow: 0 20px 40px -10px rgba(var(--aura-accent-rgb), 0.5); }
        .edit-inputs-btn-mini { background: none; border: none; color: var(--color-text-3); font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; opacity: 0.6; transition: all 0.3s ease; }
        .edit-inputs-btn-mini:hover { opacity: 1; color: var(--color-text-2); }

        .loader { width: 24px; height: 24px; border: 4px solid rgba(255, 255, 255, 0.1); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (min-width: 768px) { .macro-pills-row { grid-template-columns: repeat(4, 1fr); } }
      `}</style>
    </div>
  );
}
