import React, { useState } from "react";
import { X, Save, Target, Flame } from "lucide-react";
import { api } from "../../utils/api";
import { setItem } from "../../utils/storage";
import { useToast } from "../common/Toast";

export default function EditGoalsModal({ currentTargets, onClose, onSave }) {
  const [calories, setCalories] = useState(currentTargets.calories || 2000);
  const [protein, setProtein] = useState(currentTargets.protein || 150);
  const [carbs, setCarbs] = useState(currentTargets.carbs || 220);
  const [fat, setFat] = useState(currentTargets.fat || 65);
  const [water, setWater] = useState(currentTargets.water || 3000);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const newTargets = {
      calories: parseInt(calories) || 2000,
      protein: parseInt(protein) || 150,
      carbs: parseInt(carbs) || 220,
      fat: parseInt(fat) || 65,
      water: parseInt(water) || 3000
    };

    try {
      await api.saveNutritionTargets({
        suggested: newTargets,
        final: newTargets,
        goal: "Custom",
        pace: "Moderate",
        diet_style: "Balanced",
        maintenance_calories: newTargets.calories,
        expected_weekly_change: 0
      });
      await setItem("aura_macro_targets", JSON.stringify(newTargets));
      if (toast?.success) toast.success("Nutrition targets updated successfully!");
      if (onSave) onSave(newTargets);
      onClose();
    } catch (err) {
      console.error("Failed to save targets", err);
      // Fallback local save if offline/error
      await setItem("aura_macro_targets", JSON.stringify(newTargets));
      if (toast?.success) toast.success("Saved targets locally!");
      if (onSave) onSave(newTargets);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div 
      className="modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 16
      }}
    >
      <div 
        className="card"
        style={{
          maxWidth: 440,
          width: "100%",
          background: "#0d1117",
          border: "1px solid var(--aura-accent, #00f2fe)",
          borderRadius: 24,
          padding: 24,
          color: "#fff",
          boxShadow: "0 20px 50px rgba(0,0,0,0.8)"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Target size={22} color="var(--aura-accent, #00f2fe)" /> Edit Daily Goals & Macros
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer" }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--color-text-3, #aaa)", marginBottom: 6 }}>
              Daily Calorie Goal (kcal)
            </label>
            <input 
              type="number"
              className="themed-input"
              style={{ width: "100%", fontSize: 22, fontWeight: 800, textAlign: "center", background: "rgba(255,255,255,0.05)", color: "#00f2fe", border: "1px solid rgba(0,242,254,0.3)", borderRadius: 12, padding: "10px" }}
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#ff70a6", marginBottom: 4, textAlign: "center" }}>
                Protein (g)
              </label>
              <input 
                type="number"
                className="themed-input"
                style={{ width: "100%", textAlign: "center", fontWeight: 700, background: "rgba(255,255,255,0.05)", color: "#fff", borderRadius: 10, padding: 8 }}
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#ff9770", marginBottom: 4, textAlign: "center" }}>
                Carbs (g)
              </label>
              <input 
                type="number"
                className="themed-input"
                style={{ width: "100%", textAlign: "center", fontWeight: 700, background: "rgba(255,255,255,0.05)", color: "#fff", borderRadius: 10, padding: 8 }}
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#ffd670", marginBottom: 4, textAlign: "center" }}>
                Fat (g)
              </label>
              <input 
                type="number"
                className="themed-input"
                style={{ width: "100%", textAlign: "center", fontWeight: 700, background: "rgba(255,255,255,0.05)", color: "#fff", borderRadius: 10, padding: 8 }}
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--color-text-3, #aaa)", marginBottom: 6 }}>
              Water Intake Target (ml)
            </label>
            <input 
              type="number"
              className="themed-input"
              style={{ width: "100%", textAlign: "center", fontWeight: 700, borderRadius: 10, padding: 8 }}
              value={water}
              onChange={(e) => setWater(e.target.value)}
            />
          </div>

          <button 
            type="submit"
            disabled={saving}
            style={{
              marginTop: 8,
              padding: "14px",
              borderRadius: 12,
              background: "var(--aura-accent)",
              color: "var(--color-on-accent)",
              fontWeight: 800,
              fontSize: 14,
              border: "none",
              cursor: "pointer",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 8
            }}
          >
            <Save size={18} /> {saving ? "Saving..." : "Save Custom Goals"}
          </button>
        </form>
      </div>
    </div>
  );
}
