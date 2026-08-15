import React, { useState, useEffect } from "react";
import { ShieldAlert, Filter, Clock } from "lucide-react";
import { admin } from "../../utils/api";

export default function AuditLog() {
  const [actionTypeFilter, setActionTypeFilter] = useState("");
  const [data, setData] = useState({ items: [], total: 0, page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAuditLogs = async (page = 1) => {
    setLoading(true);
    setError("");
    try {
      const res = await admin.getAuditLog("", actionTypeFilter, page, 20);
      setData(res);
    } catch (err) {
      setError(err.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs(1);
  }, [actionTypeFilter]);

  const getActionBadgeColor = (actionType) => {
    if (actionType.includes("approve") || actionType.includes("reinstate")) return "#10b981";
    if (actionType.includes("reject") || actionType.includes("suspend") || actionType.includes("dismiss")) return "#ef4444";
    return "#0ea5e9";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: "#fff", margin: 0 }}>Admin Audit Log</h2>
          <div style={{ fontSize: 13, color: "#94a3b8" }}>Immutable security audit trail of all administrative actions</div>
        </div>

        {/* Action Type Filter */}
        <select
          value={actionTypeFilter}
          onChange={(e) => setActionTypeFilter(e.target.value)}
          style={{
            padding: "8px 14px",
            borderRadius: 10,
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            color: "#fff",
            fontSize: 13,
            outline: "none"
          }}
        >
          <option value="" style={{ background: "#0f172a" }}>All Action Types</option>
          <option value="approve_coach_verification" style={{ background: "#0f172a" }}>Approve Coach Verification</option>
          <option value="reject_coach_verification" style={{ background: "#0f172a" }}>Reject Coach Verification</option>
          <option value="suspend_user" style={{ background: "#0f172a" }}>Suspend User</option>
          <option value="reinstate_user" style={{ background: "#0f172a" }}>Reinstate User</option>
          <option value="resolve_report" style={{ background: "#0f172a" }}>Resolve Report</option>
          <option value="dismiss_report" style={{ background: "#0f172a" }}>Dismiss Report</option>
        </select>
      </div>

      {error && (
        <div style={{ padding: 12, borderRadius: 10, background: "rgba(239,68,68,0.15)", color: "#f87171", fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Audit Log Table */}
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
              <th style={{ padding: "14px 16px", color: "#94a3b8", fontWeight: 700 }}>Timestamp</th>
              <th style={{ padding: "14px 16px", color: "#94a3b8", fontWeight: 700 }}>Admin</th>
              <th style={{ padding: "14px 16px", color: "#94a3b8", fontWeight: 700 }}>Action Type</th>
              <th style={{ padding: "14px 16px", color: "#94a3b8", fontWeight: 700 }}>Target</th>
              <th style={{ padding: "14px 16px", color: "#94a3b8", fontWeight: 700 }}>Reason / Rationale</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: 30, textAlign: "center", color: "#64748b" }}>Loading audit log...</td>
              </tr>
            ) : data.items.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 30, textAlign: "center", color: "#64748b" }}>No audit log entries found.</td>
              </tr>
            ) : (
              data.items.map((row) => {
                const color = getActionBadgeColor(row.action_type);
                return (
                  <tr key={row.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "#94a3b8", whiteSpace: "nowrap" }}>
                      {row.created_at ? new Date(row.created_at).toLocaleString() : "N/A"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 700, color: "#fff" }}>{row.admin_name}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{row.admin_email}</div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: 8,
                          fontSize: 11,
                          fontWeight: 800,
                          background: `${color}20`,
                          color: color,
                          border: `1px solid ${color}40`
                        }}
                      >
                        {row.action_type}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "#e2e8f0" }}>
                      {row.target_type} #{row.target_id || "N/A"}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "#cbd5e1" }}>
                      {row.reason || "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
