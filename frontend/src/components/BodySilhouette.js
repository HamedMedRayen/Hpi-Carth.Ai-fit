import React, { useState, useMemo } from "react";
import Model from "react-body-highlighter";
import { useTheme } from "../utils/theme";

const MAPPING = {
  neck: ["neck"],
  shoulders: ["front-deltoids", "back-deltoids"],
  chest: ["chest"],
  waist: ["abs", "obliques"],
  hips: ["gluteal"],
  left_arm: ["biceps", "triceps", "forearm"],
  right_arm: ["biceps", "triceps", "forearm"],
  left_thigh: ["quadriceps", "hamstring", "adductor", "abductors"],
  right_thigh: ["quadriceps", "hamstring", "adductor", "abductors"],
  left_calf: ["calves"],
  right_calf: ["calves"],
  upper_back: ["upper-back", "trapezius"],
  lower_back: ["lower-back"]
};

// Maps backend/DB keys to Model muscle keys
function mapBodyParts(keys) {
  let mapped = [];
  for (let k of keys) {
    if (MAPPING[k]) {
      mapped.push(...MAPPING[k]);
    } else {
      mapped.push(k.replace("_", "-"));
    }
  }
  return [...new Set(mapped)]; // unique
}

function getFrequency(current, previous, injurySeverity) {
  if (injurySeverity) {
    if (injurySeverity >= 8) return 3; // Red
    if (injurySeverity >= 5) return 4; // Orange
    return 5; // Yellow
  }
  if (current == null) return 0;
  if (previous == null) return 2; // Cyan
  const delta = current - previous;
  if (delta < 0) return 1; // Green
  if (delta > 0) return 3; // Red
  return 2; // Cyan
}

export default function BodySilhouette({ latest, previous, injuries = [], onZoneClick }) {
  // We bucket all known parts into frequencies
  const allKeys = Object.keys(MAPPING);
  const buckets = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  
  const safeLatest = latest || {};
  const safePrevious = previous || {};

  for (let key of allKeys) {
    const current = safeLatest[key];
    const prev = safePrevious[key];
    
    // ONLY show ACTIVE injuries on the map
    const activeInjury = injuries.find(i => i.body_part === key && i.status === 'active');
    
    const freq = getFrequency(current, prev, activeInjury?.severity);
    if (freq > 0) {
      buckets[freq].push(...MAPPING[key]);
    }
  }

  const data = [
    { name: "Decreased", muscles: [...new Set(buckets[1])], frequency: 1 },
    { name: "Tracked", muscles: [...new Set(buckets[2])], frequency: 2 },
    { name: "Increased/High", muscles: [...new Set(buckets[3])], frequency: 3 },
    { name: "Med Injury", muscles: [...new Set(buckets[4])], frequency: 4 },
    { name: "Low Injury", muscles: [...new Set(buckets[5])], frequency: 5 },
  ];

  const { theme, previewTheme } = useTheme();
  const activeTheme = previewTheme || theme;

  const highlightedColors = useMemo(() => {
    if (activeTheme === 'monochrome') {
      return [
        "#999999", // Freq 1 (Decreased)
        "#666666", // Freq 2 (Tracked)
        "#ffffff", // Freq 3 (Increased) - keeps it visible
        "#F97316", // Freq 4 (Med Injury) - ALLOWED COLOR
        "#EAB308", // Freq 5 (Low Injury) - ALLOWED COLOR
      ];
    }
    const base = 'var(--aura-accent)';
    return [
      `color-mix(in srgb, ${base}, #22C55E)`, // Freq 1
      `color-mix(in srgb, ${base}, #00BCD4)`, // Freq 2
      `color-mix(in srgb, ${base}, #EF4444)`, // Freq 3
      "#F97316", // Freq 4 (Stay orange for injury)
      "#EAB308", // Freq 5 (Stay yellow for injury)
    ];
  }, [activeTheme]);

  const handleClick = (payload) => {
    if (!payload || !payload.muscle) return;
    // Map back to our key
    let originalKey = Object.keys(MAPPING).find(k => MAPPING[k].includes(payload.muscle)) || payload.muscle;
    let label = originalKey.replace("_", " ");
    label = label.charAt(0).toUpperCase() + label.slice(1);
    if (onZoneClick) onZoneClick(originalKey, label);
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "min(32px, 5vw)", padding: "20px 0", touchAction: "manipulation" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-2)", marginBottom: 12, textTransform: "uppercase", letterSpacing: '0.05em' }}>Anterior</span>
        <Model
          data={data}
          style={{ width: "min(220px, 42vw)", cursor: "pointer" }}
          onClick={handleClick}
          type="anterior"
          bodyColor="var(--color-body-map)"
          highlightedColors={highlightedColors}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-2)", marginBottom: 12, textTransform: "uppercase", letterSpacing: '0.05em' }}>Posterior</span>
        <Model
          data={data}
          style={{ width: "min(220px, 42vw)", cursor: "pointer" }}
          onClick={handleClick}
          type="posterior"
          bodyColor="var(--color-body-map)"
          highlightedColors={highlightedColors}
        />
      </div>
    </div>
  );
}
