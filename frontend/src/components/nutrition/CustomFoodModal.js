import React, { useState } from "react";
import { X, Save, Clipboard } from "lucide-react";
import { api } from "../../utils/api";
import { useToast } from "../common/Toast";

export default function CustomFoodModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    name: "",
    brand: "",
    category: "",
    calories: "",
    protein_g: "",
    carbs_g: "",
    fat_g: "",
    fiber_g: "",
    serving_size: 100,
    serving_unit: "g"
  });
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.calories) return;
    setLoading(true);
    try {
      await api.createCustomFood({
        ...form,
        calories: parseFloat(form.calories),
        protein_g: parseFloat(form.protein_g) || 0,
        carbs_g: parseFloat(form.carbs_g) || 0,
        fat_g: parseFloat(form.fat_g) || 0,
        fiber_g: parseFloat(form.fiber_g) || 0,
        serving_size: parseFloat(form.serving_size) || 100
      });
      onSave();
      onClose();
    } catch (e) {
      toast.error("Failed to create food");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }}>
      <div className="card modal-content" style={{ maxWidth: 450, width: "90%", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Clipboard size={20} color="var(--aura-accent)" /> Create Custom Food
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--color-text-3)", cursor: "pointer" }}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--color-text-3)", marginBottom: 6 }}>Food Name</label>
            <input
              type="text"
              className="themed-input"
              placeholder="e.g. My Special Protein Bar"
              style={{ width: "100%" }}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--color-text-3)", marginBottom: 6 }}>Brand (Optional)</label>
              <input
                type="text"
                className="themed-input"
                style={{ width: "100%" }}
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--color-text-3)", marginBottom: 6 }}>Category</label>
              <input
                type="text"
                className="themed-input"
                placeholder="e.g. Snacks"
                style={{ width: "100%" }}
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--color-text-3)", marginBottom: 6 }}>Serving Size</label>
              <input
                type="number"
                className="themed-input"
                style={{ width: "100%" }}
                value={form.serving_size}
                onChange={(e) => setForm({ ...form, serving_size: e.target.value })}
                required
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--color-text-3)", marginBottom: 6 }}>Unit</label>
              <select 
                className="themed-input" 
                style={{ width: "100%" }}
                value={form.serving_unit}
                onChange={(e) => setForm({ ...form, serving_unit: e.target.value })}
              >
                <option value="g">g</option>
                <option value="ml">ml</option>
                <option value="oz">oz</option>
                <option value="serving">serving</option>
              </select>
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.03)", padding: 16, borderRadius: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Nutritional Values (per serving)</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "var(--color-text-3)", marginBottom: 4 }}>Calories</label>
                <input type="number" className="themed-input" value={form.calories} onChange={(e) => setForm({ ...form, calories: e.target.value })} required />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "var(--color-text-3)", marginBottom: 4 }}>Protein (g)</label>
                <input type="number" className="themed-input" value={form.protein_g} onChange={(e) => setForm({ ...form, protein_g: e.target.value })} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "var(--color-text-3)", marginBottom: 4 }}>Carbs (g)</label>
                <input type="number" className="themed-input" value={form.carbs_g} onChange={(e) => setForm({ ...form, carbs_g: e.target.value })} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "var(--color-text-3)", marginBottom: 4 }}>Fat (g)</label>
                <input type="number" className="themed-input" value={form.fat_g} onChange={(e) => setForm({ ...form, fat_g: e.target.value })} />
              </div>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            style={{ background: "var(--aura-accent)", color: "#000", border: "none", padding: "14px", borderRadius: 12, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}
          >
            {loading ? "Saving..." : "Create Food"}
          </button>
        </form>
      </div>
    </div>
  );
}
