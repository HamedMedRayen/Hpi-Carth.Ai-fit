import React, { useState } from "react";
import Model from "react-body-highlighter";

const CATEGORY_MAP = {
  chest: "chest",
  "upper-back": "back",
  "lower-back": "back",
  trapezius: "back",
  biceps: "upper arms",
  triceps: "upper arms",
  forearm: "lower arms",
  "front-deltoids": "shoulders",
  "back-deltoids": "shoulders",
  abs: "waist",
  obliques: "waist",
  quadriceps: "upper legs",
  hamstring: "upper legs",
  gluteal: "upper legs",
  adductor: "upper legs",
  abductors: "upper legs",
  calves: "lower legs",
  neck: "neck",
  head: "neck"
};

export default function BodyMap({ selected, onSelect }) {
  const handleClick = (payload) => {
    // payload is { muscle: 'chest', data: { ... } }
    if (!payload || !payload.muscle) return;
    const cat = CATEGORY_MAP[payload.muscle] || payload.muscle;
    onSelect(selected === cat ? null : cat);
  };

  // Convert "selected" category back to all matching muscles to highlight them
  const highlightedMuscles = Object.entries(CATEGORY_MAP)
    .filter(([_, cat]) => cat === selected)
    .map(([muscle]) => muscle);

  const data = highlightedMuscles.length > 0 ? [
    { name: "Selected", muscles: highlightedMuscles, frequency: 1 }
  ] : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Select Body Part</span>
        {selected && (
          <button onClick={() => onSelect(null)} style={{ background:"none", border:"none", color:"var(--aura-accent)", cursor:"pointer", fontSize:12, fontWeight:600 }}>Clear</button>
        )}
      </div>

      <div style={{ 
        background: "rgba(255,255,255,0.02)", 
        borderRadius: 14, 
        border: "1px solid var(--bg-input)",
        padding: "20px 0",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        minHeight: 380,
        flexWrap: "wrap",
        gap: 16
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-2)", marginBottom: 12, textTransform: "uppercase", letterSpacing: '0.05em' }}>Anterior</span>
          <Model
            data={data}
            style={{ width: "150px", cursor: "pointer" }}
            onClick={handleClick}
            type="anterior"
            bodyColor="var(--color-body-map)"
            highlightedColors={["var(--aura-accent)"]}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-2)", marginBottom: 12, textTransform: "uppercase", letterSpacing: '0.05em' }}>Posterior</span>
          <Model
            data={data}
            style={{ width: "150px", cursor: "pointer" }}
            onClick={handleClick}
            type="posterior"
            bodyColor="var(--color-body-map)"
            highlightedColors={["var(--aura-accent)"]}
          />
        </div>
      </div>

      {selected && (
        <div style={{ padding: "8px 14px", borderRadius: 10, background: `color-mix(in srgb, var(--aura-accent) 15%, transparent)`,
          border: `1px solid var(--aura-accent)`, color: "var(--aura-accent)", fontSize: 12, fontWeight: 600, textAlign: "center", textTransform: "capitalize" }}>
          Filtering: {selected}
        </div>
      )}
    </div>
  );
}
