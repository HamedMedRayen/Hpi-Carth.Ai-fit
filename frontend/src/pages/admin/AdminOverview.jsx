import React, { useState, useEffect } from "react";
import { Users, ShieldCheck, Flag, Award, ArrowRight, Activity } from "lucide-react";
import { admin } from "../../utils/api";

export default function AdminOverview({ setActiveTab }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStats = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await admin.getStats();
      setStats(data);
    } catch (err) {
      setError(err.message || "Failed to load admin stats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const cards = [
    {
      title: "Total Registered Users",
      value: stats?.total_users ?? "—",
      sub: "Athletes, coaches & staff",
      icon: Users,
      color: "#0ea5e9",
      tab: "users"
    },
    {
      title: "Pending Verifications",
      value: stats?.pending_verifications ?? "—",
      sub: "Coaches awaiting document review",
      icon: ShieldCheck,
      color: "#f59e0b",
      tab: "verifications"
    },
    {
      title: "Open Reports",
      value: stats?.open_reports ?? "—",
      sub: "Unresolved coach & bug reports",
      icon: Flag,
      color: "#ef4444",
      tab: "reports"
    },
    {
      title: "Verified Coaches",
      value: stats?.active_coaches ?? "—",
      sub: "Active approved coaching staff",
      icon: Award,
      color: "#10b981",
      tab: "users"
    }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: "#fff", margin: "0 0 4px 0" }}>
            Admin Command Center
          </h2>
          <div style={{ fontSize: 13, color: "#94a3b8" }}>
            System overview and quick management access
          </div>
        </div>
        <button
          onClick={loadStats}
          style={{
            padding: "8px 14px",
            borderRadius: 10,
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            color: "#cbd5e1",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer"
          }}
        >
          Refresh Stats
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 12,
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#f87171",
            fontSize: 13
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16
        }}
      >
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={() => card.tab && setActiveTab(card.tab)}
              style={{
                background: "rgba(15, 23, 42, 0.6)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 16,
                padding: 20,
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    background: `${card.color}20`,
                    border: `1px solid ${card.color}40`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: card.color
                  }}
                >
                  <Icon size={20} />
                </div>
                <ArrowRight size={16} color="#64748b" />
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", lineHeight: 1 }}>
                  {loading ? "..." : card.value}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginTop: 6 }}>
                  {card.title}
                </div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                  {card.sub}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
