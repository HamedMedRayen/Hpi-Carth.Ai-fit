import React, { useState, useEffect } from "react";
import { Search, UserX, UserCheck, Shield, AlertTriangle, RefreshCw } from "lucide-react";
import { admin } from "../../utils/api";

export default function UserManagement() {
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [data, setData] = useState({ items: [], total: 0, page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedUser, setSelectedUser] = useState(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadUsers = async (page = 1) => {
    setLoading(true);
    setError("");
    try {
      const res = await admin.getUsers(roleFilter, searchQuery, statusFilter, page, 20);
      setData(res);
    } catch (err) {
      setError(err.message || "Failed to load users list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [roleFilter, statusFilter, searchQuery]);

  const handleSuspend = async () => {
    if (!suspendReason.trim()) {
      alert("Please provide a reason for suspending this user.");
      return;
    }
    setActionLoading(true);
    try {
      await admin.suspendUser(selectedUser.id, suspendReason.trim());
      setShowSuspendModal(false);
      setSuspendReason("");
      setSelectedUser(null);
      loadUsers(data.page);
    } catch (err) {
      alert(err.message || "Failed to suspend user");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReinstate = async (user) => {
    if (!window.confirm(`Reinstate access for ${user.name}?`)) return;
    setActionLoading(true);
    try {
      await admin.reinstateUser(user.id);
      loadUsers(data.page);
    } catch (err) {
      alert(err.message || "Failed to reinstate user");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: "#fff", margin: 0 }}>User Management</h2>
          <div style={{ fontSize: 13, color: "#94a3b8" }}>Search, moderate, and manage user permissions</div>
        </div>

        {/* Filter Bar */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {/* Search Box */}
          <div style={{ position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: 12, top: 11, color: "#64748b" }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name or email..."
              style={{
                padding: "8px 14px 8px 36px",
                borderRadius: 10,
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#fff",
                fontSize: 13,
                outline: "none",
                width: 220
              }}
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#fff",
              fontSize: 13,
              outline: "none"
            }}
          >
            <option value="" style={{ background: "#0f172a" }}>All Roles</option>
            <option value="athlete" style={{ background: "#0f172a" }}>Athlete</option>
            <option value="coach" style={{ background: "#0f172a" }}>Coach</option>
            <option value="admin" style={{ background: "#0f172a" }}>Admin</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#fff",
              fontSize: 13,
              outline: "none"
            }}
          >
            <option value="" style={{ background: "#0f172a" }}>All Statuses</option>
            <option value="active" style={{ background: "#0f172a" }}>Active</option>
            <option value="suspended" style={{ background: "#0f172a" }}>Suspended</option>
          </select>
        </div>
      </div>

      {error && (
        <div style={{ padding: 12, borderRadius: 10, background: "rgba(239,68,68,0.15)", color: "#f87171", fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Users Table */}
      <div
        style={{
          background: "rgba(15, 23, 42, 0.6)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: 16,
          overflow: "hidden"
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13, color: "#cbd5e1" }}>
          <thead>
            <tr style={{ background: "rgba(255, 255, 255, 0.04)", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <th style={{ padding: "14px 16px", color: "#94a3b8", fontWeight: 700 }}>User</th>
              <th style={{ padding: "14px 16px", color: "#94a3b8", fontWeight: 700 }}>Role</th>
              <th style={{ padding: "14px 16px", color: "#94a3b8", fontWeight: 700 }}>Status</th>
              <th style={{ padding: "14px 16px", color: "#94a3b8", fontWeight: 700 }}>Joined</th>
              <th style={{ padding: "14px 16px", color: "#94a3b8", fontWeight: 700, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: 30, textAlign: "center", color: "#64748b" }}>Loading users...</td>
              </tr>
            ) : data.items.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 30, textAlign: "center", color: "#64748b" }}>No users match the criteria.</td>
              </tr>
            ) : (
              data.items.map((row) => (
                <tr key={row.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 10,
                          background: "rgba(255,255,255,0.1)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          color: "#fff"
                        }}
                      >
                        {row.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: "#fff" }}>{row.name}</div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>{row.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: 800,
                        textTransform: "uppercase",
                        background:
                          row.role === "admin"
                            ? "rgba(239, 68, 68, 0.2)"
                            : row.role === "coach"
                            ? "rgba(168, 85, 247, 0.2)"
                            : "rgba(14, 165, 233, 0.2)",
                        color:
                          row.role === "admin"
                            ? "#ef4444"
                            : row.role === "coach"
                            ? "#c084fc"
                            : "#38bdf8"
                      }}
                    >
                      {row.role}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {row.is_suspended ? (
                      <span style={{ color: "#ef4444", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                        <UserX size={14} /> Suspended
                      </span>
                    ) : (
                      <span style={{ color: "#10b981", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                        <UserCheck size={14} /> Active
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "#94a3b8" }}>
                    {row.created_at ? new Date(row.created_at).toLocaleDateString() : "N/A"}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    {row.role === "admin" ? (
                      <span style={{ fontSize: 11, color: "#64748b" }}>Protected</span>
                    ) : row.is_suspended ? (
                      <button
                        onClick={() => handleReinstate(row)}
                        disabled={actionLoading}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 8,
                          background: "rgba(16, 185, 129, 0.2)",
                          border: "1px solid rgba(16, 185, 129, 0.4)",
                          color: "#34d399",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                      >
                        Reinstate
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedUser(row);
                          setShowSuspendModal(true);
                        }}
                        disabled={actionLoading}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 8,
                          background: "rgba(239, 68, 68, 0.15)",
                          border: "1px solid rgba(239, 68, 68, 0.3)",
                          color: "#f87171",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                      >
                        Suspend
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Suspend Reason Modal */}
      {showSuspendModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowSuspendModal(false)} style={{ zIndex: 10000 }}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 440,
              width: "90%",
              padding: 24,
              borderRadius: 20,
              background: "rgba(15, 23, 42, 0.95)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#fff"
            }}
          >
            <h3 style={{ margin: "0 0 10px 0", fontSize: 18, fontWeight: 800 }}>Suspend User Account</h3>
            <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 14 }}>
              Are you sure you want to suspend <strong>{selectedUser.name}</strong> ({selectedUser.email})?
            </div>

            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              rows={4}
              placeholder="Reason for suspension (terms violation, abusive behavior...)"
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#fff",
                fontSize: 13,
                outline: "none",
                marginBottom: 16
              }}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => setShowSuspendModal(false)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.08)",
                  border: "none",
                  color: "#cbd5e1",
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSuspend}
                disabled={actionLoading}
                style={{
                  padding: "8px 18px",
                  borderRadius: 10,
                  background: "#ef4444",
                  border: "none",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                {actionLoading ? "Processing..." : "Confirm Suspension"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
