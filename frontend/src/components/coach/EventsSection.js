import React from "react";
import { Trophy, Calendar, MapPin, Plus, Flame, Shield } from "lucide-react";

export default function EventsSection() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: "8px 0" }}>
      {/* Top Banner */}
      <div style={{
        background: "linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(239, 68, 68, 0.08) 100%)",
        border: "1px solid rgba(245, 158, 11, 0.25)",
        borderRadius: 24,
        padding: 32,
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            background: "rgba(245, 158, 11, 0.2)",
            border: "1px solid rgba(245, 158, 11, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#f59e0b",
          }}>
            <Trophy size={28} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-0.5px" }}>
              Challenges & Gym Events
            </div>
            <div style={{ fontSize: 13, color: "var(--color-text-2)", marginTop: 4 }}>
              Create coach-scoped athlete challenges and host gym events.
            </div>
          </div>
        </div>

        <div style={{
          display: "flex",
          gap: 12,
          marginTop: 20,
          flexWrap: "wrap",
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            borderRadius: 10,
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            fontSize: 12,
            color: "var(--color-text-2)",
          }}>
            <Flame size={14} style={{ color: "#f59e0b" }} />
            Roster Leaderboards & Streaks
          </div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            borderRadius: 10,
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            fontSize: 12,
            color: "var(--color-text-2)",
          }}>
            <MapPin size={14} style={{ color: "#f59e0b" }} />
            Linked Gym Location Events
          </div>
        </div>
      </div>

      {/* Events Workspace Content */}
      <div style={{
        background: "var(--bg-glass, rgba(15, 23, 42, 0.6))",
        border: "1px solid var(--border-card, rgba(255, 255, 255, 0.08))",
        borderRadius: 24,
        padding: 28,
        backdropFilter: "blur(16px)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
            <Trophy size={18} style={{ color: "#f59e0b" }} />
            Active Challenges & Events
          </div>
        </div>

        <div style={{
          padding: 32,
          textAlign: "center",
          background: "rgba(255, 255, 255, 0.015)",
          border: "1px dashed rgba(255, 255, 255, 0.1)",
          borderRadius: 16,
        }}>
          <Trophy size={36} style={{ color: "#f59e0b", marginBottom: 12 }} />
          <h3 style={{ fontSize: 17, fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>
            Coach Events Workspace Ready
          </h3>
          <p style={{ fontSize: 13, color: "var(--color-text-2)", maxWidth: 500, margin: "0 auto", lineHeight: 1.6 }}>
            Coach-created events and challenges will appear here and sync directly with the Phase 2 Schedule Calendar.
          </p>
        </div>
      </div>
    </div>
  );
}
