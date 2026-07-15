import React, { useState, useEffect, useMemo } from "react";
import { Search, X, Plus, ChevronRight, Brain } from "lucide-react";
import { api } from "../../utils/api";
import { useToast } from "../Toast";

export default function FoodSearchModal({ onClose, onLog, onSwitchToCustom }) {
  const [query, setQuery] = useState("");
  const [allFoods, setAllFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFood, setSelectedFood] = useState(null);
  const [amount, setAmount] = useState(100);
  const [unit, setUnit] = useState("g");
  const toast = useToast();

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        console.log("Fetching all foods...");
        const data = await api.getAllFood();
        if (isMounted) {
          console.log("Successfully loaded foods:", data?.length);
          setAllFoods(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      } catch (e) {
        console.error("Failed to load food database", e);
        if (isMounted) setLoading(false);
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, []);

  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !Array.isArray(allFoods)) return [];
    
    return allFoods
      .filter(f => 
        (f && f.name && f.name.toLowerCase().includes(q)) || 
        (f && f.brand && f.brand.toLowerCase().includes(q))
      )
      .sort((a, b) => {
        const aStarts = a.name?.toLowerCase().startsWith(q);
        const bStarts = b.name?.toLowerCase().startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return (b.popularity || 0) - (a.popularity || 0);
      })
      .slice(0, 50);
  }, [query, allFoods]);

  const initialOptions = [
    { name: "Chicken Breast", calories: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6, serving_size: 100, serving_unit: "g" },
    { name: "White Rice", calories: 130, protein_g: 2.7, carbs_g: 28, fat_g: 0.3, serving_size: 100, serving_unit: "g" },
    { name: "Whole Egg", calories: 155, protein_g: 13, carbs_g: 1.1, fat_g: 11, serving_size: 100, serving_unit: "g" },
    { name: "Oatmeal", calories: 68, protein_g: 2.4, carbs_g: 12, fat_g: 1.4, serving_size: 100, serving_unit: "g" }
  ];

  const handleLog = async () => {
    if (!selectedFood) return;
    try {
      const parsedAmount = parseFloat(amount) || 0;
      const ratio = unit === 'serving' 
        ? parsedAmount 
        : (parsedAmount * (unit === 'kg' ? 1000 : unit === 'oz' ? 28.35 : unit === 'lb' ? 453.59 : 1)) / (selectedFood.serving_size || 1);

      await api.logNutrition({
        meal_name: selectedFood.name,
        food_id: selectedFood.id,
        amount: parsedAmount,
        unit: unit,
        calories: (selectedFood.calories || 0) * ratio,
        protein_g: (selectedFood.protein_g || 0) * ratio,
        carbs_g: (selectedFood.carbs_g || 0) * ratio,
        fat_g: (selectedFood.fat_g || 0) * ratio,
        fiber_g: (selectedFood.fiber_g || 0) * ratio
      });
      onLog();
      onClose();
    } catch (e) {
      toast.error("Failed to log food");
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1000, position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
      <div className="card" style={{ maxWidth: 500, width: "95%", maxHeight: "90vh", display: "flex", flexDirection: "column", background: "#111", border: "1px solid var(--aura-accent)", borderRadius: 24, padding: 24, color: "#fff", boxShadow: "0 0 40px rgba(0,0,0,0.5)" }}>
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, background: 'linear-gradient(90deg, #fff, #888)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Search Food</h2>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.05)", border: "none", color: "#fff", cursor: "pointer", width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} />
          </button>
        </div>

        {!selectedFood ? (
          <>
            {/* Search Input */}
            <div style={{ position: "relative", marginBottom: 24 }}>
              <Search style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "var(--aura-accent)" }} size={20} />
              <input
                autoFocus
                type="text"
                placeholder="Find chicken, pasta, protein..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ 
                  paddingLeft: 48, width: "100%", height: 56, background: "rgba(255,255,255,0.05)", 
                  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, color: "#fff", fontSize: 16, outline: 'none'
                }}
              />
            </div>

            {/* Results List */}
            <div style={{ flex: 1, overflowY: "auto", minHeight: 350, paddingRight: 4 }}>
              
              {/* Show Quick Options if no query */}
              {!query.trim() && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--aura-accent)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Recommended</div>
                  {initialOptions.map((food, i) => (
                    <div
                      key={`quick-${i}`}
                      onClick={() => setSelectedFood(food)}
                      className="food-item-row"
                      style={{
                        padding: "16px", background: 'rgba(255,255,255,0.02)', borderRadius: 12, marginBottom: 8, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center"
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>{food.name}</div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Tap to log</div>
                      </div>
                      <div style={{ width: 32, height: 32, background: 'var(--aura-accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <Plus size={16} color="#000" strokeWidth={3} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Show Filtered Results */}
              {query.trim() && filteredResults.length > 0 && (
                <div style={{ animation: 'fadeIn 0.2s ease' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--aura-accent)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Search Results ({filteredResults.length})</div>
                  {filteredResults.map((food) => (
                    <div
                      key={food.id || food.name}
                      onClick={() => setSelectedFood(food)}
                      className="food-item-row"
                      style={{
                        padding: "16px", background: 'rgba(255,255,255,0.02)', borderRadius: 12, marginBottom: 8, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center"
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>{food.name}</div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                          {food.brand ? `${food.brand} • ` : ""}{Math.round(food.calories)} kcal / {food.serving_size}{food.serving_unit}
                        </div>
                      </div>
                      <ChevronRight size={18} color="rgba(255,255,255,0.2)" />
                    </div>
                  ))}
                </div>
              )}

              {/* No Results Fallback */}
              {query.trim() && filteredResults.length === 0 && !loading && (
                <div style={{ textAlign: "center", padding: "40px 20px", background: 'rgba(255,255,255,0.02)', borderRadius: 20, border: '1px dashed rgba(255,255,255,0.1)' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Not in Library</div>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 24 }}>
                    We couldn't find "{query}" in our local database.
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <button 
                      onClick={() => { onClose(); window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); }}
                      style={{ 
                        background: "var(--aura-accent)", color: "#000", border: "none", height: 50, borderRadius: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8
                      }}
                    >
                      <Brain size={18} /> Use AI Assistant
                    </button>
                    <button 
                      onClick={() => onSwitchToCustom()}
                      style={{ 
                        background: "rgba(255,255,255,0.05)", color: "#fff", border: "1px solid rgba(255,255,255,0.1)", height: 50, borderRadius: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8
                      }}
                    >
                      <Plus size={18} /> Create Custom Food
                    </button>
                  </div>
                </div>
              )}

              {loading && query.trim() && (
                <div style={{ textAlign: "center", padding: 40 }}>
                   <div className="spinner" style={{ width: 30, height: 30, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--aura-accent)', borderRadius: '50%', margin: '0 auto 12px' }}></div>
                   <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Initializing Food Library...</div>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Selection Preview (Amount/Units) */
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <button 
                onClick={() => setSelectedFood(null)}
                style={{ background: "none", border: "none", color: "var(--aura-accent)", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 12, padding: 0 }}
              >
                ← Back to search
              </button>
              <h3 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>{selectedFood.name}</h3>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", margin: "4px 0 0 0" }}>{selectedFood.brand || "Generic Food"}</p>
            </div>

            <div style={{ background: "rgba(255,255,255,0.03)", padding: 24, borderRadius: 20, border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <span style={{ fontWeight: 700, fontSize: 16 }}>Portion Size</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="number"
                    style={{ width: 80, height: 40, textAlign: "center", background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <select 
                    style={{ height: 40, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', padding: '0 8px' }}
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                  >
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="oz">oz</option>
                    <option value="lb">lb</option>
                    <option value="serving">serving</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {['Calories', 'Protein', 'Carbs', 'Fat'].map((macro, idx) => {
                  const val = macro === 'Calories' ? selectedFood.calories : 
                             macro === 'Protein' ? selectedFood.protein_g :
                             macro === 'Carbs' ? selectedFood.carbs_g : selectedFood.fat_g;
                  
                  const parsedAmount = parseFloat(amount) || 0;
                  const ratio = unit === 'serving' 
                    ? parsedAmount 
                    : (parsedAmount * (unit === 'kg' ? 1000 : unit === 'oz' ? 28.35 : unit === 'lb' ? 453.59 : 1)) / (selectedFood.serving_size || 1);
                    
                  return (
                    <div key={macro} style={{ background: "rgba(255,255,255,0.03)", padding: 16, borderRadius: 16, textAlign: "center", border: '1px solid rgba(255,255,255,0.03)' }}>
                      <div style={{ fontSize: 10, opacity: 0.4, textTransform: "uppercase", fontWeight: 700, letterSpacing: '0.05em', marginBottom: 4 }}>{macro}</div>
                      <div style={{ fontSize: 18, fontWeight: 900 }}>{Math.round((val || 0) * ratio * 10) / 10}<span style={{ fontSize: 12, fontWeight: 600, opacity: 0.5, marginLeft: 2 }}>{macro === 'Calories' ? '' : 'g'}</span></div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button 
              onClick={handleLog}
              style={{ background: "var(--aura-accent)", color: "#000", border: "none", height: 60, borderRadius: 16, fontWeight: 800, cursor: "pointer", fontSize: 18, boxShadow: '0 8px 20px rgba(0,0,0,0.3)' }}
            >
              Add to Log
            </button>
          </div>
        )}
      </div>
      <style>{`
        .food-item-row:hover { background: rgba(255,255,255,0.05) !important; transform: scale(1.01); transition: all 0.2s; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
