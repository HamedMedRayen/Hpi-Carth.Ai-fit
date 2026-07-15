import React, { useState } from "react";
import { X, Zap } from "lucide-react";
import { api } from "../../utils/api";
import { useToast } from "../Toast";

export default function QuickAddModal({ onClose, onLog }) {
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [name, setName] = useState("Quick Add");
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!calories) return;
    setLoading(true);
    try {
      await api.logNutrition({
        meal_name: name,
        amount: 1,
        unit: "serving",
        calories: parseFloat(calories),
        protein_g: parseFloat(protein) || 0,
        carbs_g: parseFloat(carbs) || 0,
        fat_g: parseFloat(fat) || 0
      });
      onLog();
      onClose();
    } catch (e) {
      toast.error("Failed to quick add");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }}>
      <div className="card modal-content" style={{ maxWidth: 400, width: "90%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Zap size={20} color="var(--aura-accent)" /> Quick Add
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--color-text-3)", cursor: "pointer" }}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleQuickAdd} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--color-text-3)", marginBottom: 8 }}>Description (Optional)</label>
            <input
              type="text"
              className="themed-input"
              placeholder="e.g. Afternoon Snack"
              style={{ width: "100%" }}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--color-text-3)", marginBottom: 8 }}>Calories (kcal)</label>
            <input
              autoFocus
              type="number"
              className="themed-input"
              placeholder="0"
              style={{ width: "100%", fontSize: 24, fontWeight: 700, textAlign: "center" }}
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--color-text-3)", marginBottom: 4, textAlign: "center" }}>Protein</label>
              <input
                type="number"
                className="themed-input"
                placeholder="0g"
                style={{ width: "100%", textAlign: "center" }}
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--color-text-3)", marginBottom: 4, textAlign: "center" }}>Carbs</label>
              <input
                type="number"
                className="themed-input"
                placeholder="0g"
                style={{ width: "100%", textAlign: "center" }}
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--color-text-3)", marginBottom: 4, textAlign: "center" }}>Fat</label>
              <input
                type="number"
                className="themed-input"
                placeholder="0g"
                style={{ width: "100%", textAlign: "center" }}
                value={fat}
                onChange={(e) => setFat(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading || !calories}
            style={{ 
              background: "var(--aura-accent)", 
              color: "#000", 
              border: "none", 
              padding: "14px", 
              borderRadius: 12, 
              fontWeight: 700, 
              cursor: (loading || !calories) ? "not-allowed" : "pointer",
              opacity: (loading || !calories) ? 0.6 : 1,
              marginTop: 8
            }}
          >
            {loading ? "Adding..." : "Log Quick Meal"}
          </button>
        </form>
      </div>
    </div>
  );
}
