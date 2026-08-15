import React, { useState, useEffect } from "react";
import { Activity, Layers } from "lucide-react";
import { api } from "../../utils/api";

export default function MuscleRecoveryWidget() {
  const [split, setSplit] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    api.getTrainingSplit().then((res) => {
      if (!isMounted) return;
      if (res && res.split) {
        setSplit(res.split);
      }
      setLoading(false);
    }).catch(() => {
      if (isMounted) setLoading(false);
    });
    return () => { isMounted = false; };
  }, []);

  const muscleGroups = [
    { name: "Chest", pct: split.chest || 35, recovery: 75, color: "#ff5252" },
    { name: "Back", pct: split.back || 25, recovery: 90, color: "#3B82F6" },
    { name: "Legs", pct: split.legs || 40, recovery: 50, color: "#10B981" },
    { name: "Shoulders", pct: split.shoulders || 15, recovery: 85, color: "#ff922b" },
    { name: "Arms", pct: split.arms || 20, recovery: 95, color: "#8b5cf6" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(236, 72, 153, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#EC4899" }}>
            <Layers size={15} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)" }}>Muscle Recovery Status</div>
            <div style={{ fontSize: 11, color: "var(--color-text-3)" }}>Estimated Tissue Restoration</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {muscleGroups.map((mg) => {
          let badge = "Fresh (Ready)";
          let badgeColor = "#10B981";
          if (mg.recovery < 60) {
            badge = "Fatigued";
            badgeColor = "#EF4444";
          } else if (mg.recovery < 85) {
            badge = "Recovering";
            badgeColor = "#F59E0B";
          }

          return (
            <div key={mg.name}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 600, marginBottom: 3 }}>
                <span style={{ color: "var(--color-text-2)" }}>{mg.name}</span>
                <span style={{ color: badgeColor, fontSize: 10, fontWeight: 700 }}>
                  {badge} • {mg.recovery}%
                </span>
              </div>
              <div style={{ height: 6, width: "100%", background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${mg.recovery}%`,
                    background: badgeColor,
                    borderRadius: 3,
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
