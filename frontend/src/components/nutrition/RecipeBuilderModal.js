import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Search, Utensils } from "lucide-react";
import { api } from "../../utils/api";
import { useToast } from "../common/Toast";

export default function RecipeBuilderModal({ onClose, onSave }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [servings, setServings] = useState(1);
  const [ingredients, setIngredients] = useState([]);
  
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const toast = useToast();

  useEffect(() => {
    if (searchQuery.length > 1) {
      const delayDebounceFn = setTimeout(async () => {
        try {
          const data = await api.searchFood(searchQuery);
          setSearchResults(data);
        } catch (e) { console.error(e); }
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const addIngredient = (food) => {
    setIngredients([...ingredients, { ...food, food_id: food.id, amount: food.serving_size, unit: food.serving_unit }]);
    setIsSearching(false);
    setSearchQuery("");
  };

  const removeIngredient = (index) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredientAmount = (index, amount) => {
    const newIngs = [...ingredients];
    newIngs[index].amount = parseFloat(amount) || 0;
    setIngredients(newIngs);
  };

  const totalMacros = ingredients.reduce((acc, ing) => {
    const ratio = ing.amount / ing.serving_size;
    acc.calories += ing.calories * ratio;
    acc.protein += (ing.protein_g || 0) * ratio;
    acc.carbs += (ing.carbs_g || 0) * ratio;
    acc.fat += (ing.fat_g || 0) * ratio;
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const handleSave = async () => {
    if (!name || ingredients.length === 0) return;
    try {
      await api.createRecipe({
        name,
        description,
        servings: parseFloat(servings),
        ingredients: ingredients.map(ing => ({
          food_id: ing.food_id,
          amount: ing.amount,
          unit: ing.unit
        }))
      });
      onSave();
      onClose();
    } catch (e) {
      toast.error("Failed to save recipe");
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }}>
      <div className="card modal-content" style={{ maxWidth: 600, width: "95%", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Utensils size={20} color="var(--aura-accent)" /> Recipe Builder
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--color-text-3)", cursor: "pointer" }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ overflowY: "auto", flex: 1, paddingRight: 8 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
            <input
              type="text"
              className="themed-input"
              placeholder="Recipe Name (e.g. Grandma's Lasagna)"
              style={{ width: "100%", fontSize: 18, fontWeight: 600 }}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--color-text-3)", marginBottom: 4 }}>Servings</label>
                <input
                  type="number"
                  className="themed-input"
                  style={{ width: "100%" }}
                  value={servings}
                  onChange={(e) => setServings(e.target.value)}
                />
              </div>
              <div style={{ flex: 3 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--color-text-3)", marginBottom: 4 }}>Description (Optional)</label>
                <input
                  type="text"
                  className="themed-input"
                  style={{ width: "100%" }}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Ingredients</h3>
              <button 
                onClick={() => setIsSearching(true)}
                style={{ background: "var(--bg-input)", border: "1px solid var(--border-input)", borderRadius: 8, padding: "4px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
              >
                <Plus size={14} /> Add Ingredient
              </button>
            </div>

            {isSearching && (
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--aura-accent)", borderRadius: 12, padding: 12, marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input
                    autoFocus
                    type="text"
                    className="themed-input"
                    placeholder="Search for ingredient..."
                    style={{ flex: 1 }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button onClick={() => setIsSearching(false)} className="themed-input" style={{ width: "auto" }}>Cancel</button>
                </div>
                <div style={{ maxHeight: 200, overflowY: "auto" }}>
                  {searchResults.map(food => (
                    <div 
                      key={food.id} 
                      onClick={() => addIngredient(food)}
                      style={{ padding: "8px 12px", borderBottom: "1px solid var(--color-border)", cursor: "pointer", fontSize: 14 }}
                    >
                      {food.name} <span style={{ color: "var(--color-text-3)", fontSize: 12 }}>({food.calories} kcal/100g)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ingredients.map((ing, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--bg-input)", padding: "8px 12px", borderRadius: 10 }}>
                  <div style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{ing.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <input
                      type="number"
                      className="themed-input"
                      style={{ width: 60, padding: "4px 8px", textAlign: "center" }}
                      value={ing.amount}
                      onChange={(e) => updateIngredientAmount(idx, e.target.value)}
                    />
                    <span style={{ fontSize: 12, color: "var(--color-text-3)" }}>{ing.unit}</span>
                  </div>
                  <button 
                    onClick={() => removeIngredient(idx)}
                    style={{ background: "none", border: "none", color: "#ff4444", cursor: "pointer", padding: 4 }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {ingredients.length === 0 && !isSearching && (
                <div style={{ textAlign: "center", padding: 20, color: "var(--color-text-3)", border: "1px dashed var(--color-border)", borderRadius: 12 }}>
                  No ingredients added yet.
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 20, marginTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{Math.round(totalMacros.calories / servings)}</div>
              <div style={{ fontSize: 10, color: "var(--color-text-3)", textTransform: "uppercase" }}>kcal/serv</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{Math.round(totalMacros.protein / servings)}g</div>
              <div style={{ fontSize: 10, color: "var(--color-text-3)", textTransform: "uppercase" }}>Protein</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{Math.round(totalMacros.carbs / servings)}g</div>
              <div style={{ fontSize: 10, color: "var(--color-text-3)", textTransform: "uppercase" }}>Carbs</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{Math.round(totalMacros.fat / servings)}g</div>
              <div style={{ fontSize: 10, color: "var(--color-text-3)", textTransform: "uppercase" }}>Fat</div>
            </div>
          </div>

          <button 
            onClick={handleSave}
            disabled={!name || ingredients.length === 0}
            style={{ 
              width: "100%", background: "var(--aura-accent)", color: "#000", border: "none", padding: "14px", borderRadius: 12, fontWeight: 700, 
              cursor: (!name || ingredients.length === 0) ? "not-allowed" : "pointer",
              opacity: (!name || ingredients.length === 0) ? 0.6 : 1
            }}
          >
            Create Recipe
          </button>
        </div>
      </div>
    </div>
  );
}
