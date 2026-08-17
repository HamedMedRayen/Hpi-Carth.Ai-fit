import React, { useState, useEffect } from "react";
import { Droplets, Plus } from "lucide-react";
import { api } from "../../utils/api";
import { getItem } from "../../utils/storage";

export default function HydrationWidget() {
  const [waterMl, setWaterMl] = useState(0);
  const [targetMl, setTargetMl] = useState(3000);
  const [logging, setLogging] = useState(false);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      api.getWaterToday().catch(() => null),
      api.getLatestNutritionTargets().catch(() => null),
      getItem("aura_macro_targets").catch(() => null),
    ]).then(([waterRes, tgtRes, savedTargetsStr]) => {
      if (!isMounted) return;
      if (waterRes) {
        setWaterMl(waterRes.amount_ml || waterRes.total_ml || 0);
      }
      if (savedTargetsStr) {
        try {
          const parsed = typeof savedTargetsStr === "string" ? JSON.parse(savedTargetsStr) : savedTargetsStr;
          if (parsed?.water) {
            setTargetMl(Number(parsed.water));
            return;
          }
        } catch (e) {}
      }
      if (tgtRes && (tgtRes.water_ml || tgtRes.water)) {
        setTargetMl(tgtRes.water_ml || tgtRes.water || 3000);
      }
    });
    return () => { isMounted = false; };
  }, []);

  const handleAdd = async (amt) => {
    if (logging) return;
    setLogging(true);
    const newTotal = waterMl + amt;
    setWaterMl(newTotal);
    try {
      await api.logWater(amt, "add");
    } catch (e) {
      console.error(e);
    } finally {
      setLogging(false);
    }
  };

  const pct = Math.min(100, Math.round((waterMl / targetMl) * 100));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(59, 130, 246, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#3B82F6" }}>
            <Droplets size={15} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)" }}>Daily Hydration</div>
            <div style={{ fontSize: 11, color: "var(--color-text-3)" }}>Target: {(targetMl / 1000).toFixed(1)}L / day</div>
          </div>
        </div>
        <span style={{ fontSize: 14, fontWeight: 900, color: "#3B82F6" }}>
          {waterMl} <span style={{ fontSize: 10, color: "var(--color-text-3)", fontWeight: 500 }}>/ {targetMl}ml</span>
        </span>
      </div>

      {/* Progress Bar */}
      <div style={{ height: 10, width: "100%", background: "rgba(255,255,255,0.06)", borderRadius: 6, overflow: "hidden", position: "relative" }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: "linear-gradient(90deg, #3B82F6 0%, #06B6D4 100%)",
            borderRadius: 6,
            transition: "width 0.4s ease",
            boxShadow: "0 0 10px rgba(6, 182, 212, 0.5)",
          }}
        />
      </div>

      {/* Quick 1-Tap Buttons */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <button
          onClick={() => handleAdd(250)}
          disabled={logging}
          style={{
            padding: "8px",
            borderRadius: 8,
            background: "rgba(59, 130, 246, 0.1)",
            border: "1px solid rgba(59, 130, 246, 0.3)",
            color: "#3B82F6",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
          }}
        >
          <Plus size={12} /> +250ml Glass
        </button>
        <button
          onClick={() => handleAdd(500)}
          disabled={logging}
          style={{
            padding: "8px",
            borderRadius: 8,
            background: "rgba(6, 182, 212, 0.1)",
            border: "1px solid rgba(6, 182, 212, 0.3)",
            color: "#06B6D4",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
          }}
        >
          <Plus size={12} /> +500ml Bottle
        </button>
      </div>
    </div>
  );
}
