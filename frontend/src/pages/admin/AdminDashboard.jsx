import React, { useState } from "react";
import { LayoutDashboard, ShieldCheck, Users, Flag, FileText, Shield } from "lucide-react";
import AdminOverview from "./AdminOverview";
import CoachVerificationQueue from "./CoachVerificationQueue";
import UserManagement from "./UserManagement";
import ReportsInbox from "./ReportsInbox";
import AuditLog from "./AuditLog";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "verifications", label: "Coach Verifications", icon: ShieldCheck },
    { id: "users", label: "User Management", icon: Users },
    { id: "reports", label: "Reports Inbox", icon: Flag },
    { id: "audit", label: "Audit Log", icon: FileText }
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "240px 1fr",
        gap: 24,
        minHeight: "82vh",
        padding: "8px 0"
      }}
    >
      {/* Admin Sidebar Navigation */}
      <aside
        style={{
          background: "rgba(15, 23, 42, 0.6)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: 20,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          height: "fit-content"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "rgba(239, 68, 68, 0.2)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ef4444"
            }}
          >
            <Shield size={18} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 900, color: "#fff" }}>Admin Module</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>HPI Administration</div>
          </div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "none",
                  background: isActive ? "linear-gradient(135deg, rgba(14, 165, 233, 0.2) 0%, rgba(2, 132, 199, 0.1) 100%)" : "transparent",
                  color: isActive ? "#38bdf8" : "#94a3b8",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s ease"
                }}
              >
                <Icon size={18} color={isActive ? "#38bdf8" : "#64748b"} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Admin View Content */}
      <main style={{ minWidth: 0 }}>
        {activeTab === "overview" && <AdminOverview setActiveTab={setActiveTab} />}
        {activeTab === "verifications" && <CoachVerificationQueue />}
        {activeTab === "users" && <UserManagement />}
        {activeTab === "reports" && <ReportsInbox />}
        {activeTab === "audit" && <AuditLog />}
      </main>
    </div>
  );
}
