import React from "react";
import { fmt } from "../../utils/formatters";
import { WeightIcon, ClockIcon } from "../../utils/icons";

function typeColor(name = "") {
  const n = name.toLowerCase();
  if (n.includes("push")) return "var(--aura-accent)";
  if (n.includes("pull")) return "var(--aura-accent2)";
  if (n.includes("legs")) return "var(--aura-accent3)";
  if (n.includes("upper")) return "var(--aura-accent4)";
  if (n.includes("lower")) return "var(--aura-accent)";
  if (n.includes("full")) return "var(--aura-accent2)";
  return "var(--aura-accent)";
}

export default function WorkoutCard({ workout, onClick }) {
  const color = typeColor(workout.workout_name);
  return (
    <div
      className="glass glass-hover"
      onClick={onClick}
      style={{ padding: "14px 16px", cursor: onClick ? "pointer" : "default" }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        {/* Color indicator */}
        <div style={{
          width: 4, borderRadius: 4,
          background: color,
          alignSelf: "stretch",
          minHeight: 44,
          flexShrink: 0,
        }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: color,
              background: `color-mix(in srgb, ${color} 12%, transparent)`,
              padding: "2px 8px", borderRadius: 6,
            }}>
              #{workout.workout_number}
            </span>
            <span style={{ fontSize: 12, color: "var(--color-text-3)" }}>
              {fmt.date(workout.session_date)}
            </span>
          </div>

          <div style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600, fontSize: 15,
            color: "var(--color-text)",
            marginBottom: 8,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {workout.workout_name}
          </div>

          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--color-text-2)" }}>
              <WeightIcon size={13} /> {fmt.int(workout.total_volume)} kg
            </span>
            <span style={{ fontSize: 12, color: "var(--color-text-2)" }}>
              {workout.total_sets} sets
            </span>
            <span style={{ fontSize: 12, color: "var(--color-text-2)" }}>
              {workout.exercises_count} exercises
            </span>
            {workout.duration_sec > 0 && (
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--color-text-2)" }}>
                <ClockIcon size={13} /> {fmt.duration(workout.duration_sec)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
