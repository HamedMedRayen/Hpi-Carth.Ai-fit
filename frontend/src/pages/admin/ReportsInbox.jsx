import React, { useState, useEffect } from "react";
import { Flag, Bug, CheckCircle, XCircle, Eye, ExternalLink, MessageSquare } from "lucide-react";
import { admin } from "../../utils/api";

export default function ReportsInbox() {
  const [activeType, setActiveType] = useState("coach"); // "coach" or "bug"
  const [statusFilter, setStatusFilter] = useState("open");
  const [data, setData] = useState({ items: [], total: 0, page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedReport, setSelectedReport] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const loadReports = async (page = 1) => {
    setLoading(true);
    setError("");
    try {
      const res = await admin.getReports(activeType, statusFilter, page, 20);
      setData(res);
    } catch (err) {
      setError(err.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports(1);
  }, [activeType, statusFilter]);

  const handleResolve = async () => {
    if (!adminNotes.trim()) {
      alert("Please provide admin notes explaining the resolution.");
      return;
    }
    setActionLoading(true);
    try {
      await admin.resolveReport(selectedReport.id, adminNotes.trim(), actionTaken.trim() || null);
      setSelectedReport(null);
      setAdminNotes("");
      setActionTaken("");
      loadReports(data.page);
    } catch (err) {
      alert(err.message || "Failed to resolve report");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDismiss = async () => {
    if (!adminNotes.trim()) {
      alert("Please provide admin notes explaining why the report was dismissed.");
      return;
    }
    setActionLoading(true);
    try {
      await admin.dismissReport(selectedReport.id, adminNotes.trim());
      setSelectedReport(null);
      setAdminNotes("");
      setActionTaken("");
      loadReports(data.page);
    } catch (err) {
      alert(err.message || "Failed to dismiss report");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: "#fff", margin: 0 }}>Reports Inbox</h2>
          <div style={{ fontSize: 13, color: "#94a3b8" }}>Review and resolve user coach reports and software bug tickets</div>
        </div>

        {/* Status & Type Filter Pills */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {/* Type Selector */}
          <div style={{ display: "flex", gap: 4, background: "rgba(255, 255, 255, 0.05)", padding: 4, borderRadius: 12 }}>
            <button
              onClick={() => setActiveType("coach")}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                border: "none",
                background: activeType === "coach" ? "rgba(239, 68, 68, 0.2)" : "transparent",
                color: activeType === "coach" ? "#f87171" : "#94a3b8",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6
              }}
            >
              <Flag size={14} /> Coach Reports
            </button>
            <button
              onClick={() => setActiveType("bug")}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                border: "none",
                background: activeType === "bug" ? "rgba(14, 165, 233, 0.2)" : "transparent",
                color: activeType === "bug" ? "#38bdf8" : "#94a3b8",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6
              }}
            >
              <Bug size={14} /> Bug Reports
            </button>
          </div>

          {/* Status Selector */}
          <div style={{ display: "flex", gap: 4, background: "rgba(255, 255, 255, 0.05)", padding: 4, borderRadius: 12 }}>
            {["open", "resolved", "dismissed", ""].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: statusFilter === st ? "rgba(255, 255, 255, 0.15)" : "transparent",
                  color: statusFilter === st ? "#fff" : "#94a3b8",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  textTransform: "capitalize"
                }}
              >
                {st || "All"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div style={{ padding: 12, borderRadius: 10, background: "rgba(239,68,68,0.15)", color: "#f87171", fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Reports Table */}
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
              <th style={{ padding: "14px 16px", color: "#94a3b8", fontWeight: 700 }}>Reporter</th>
              <th style={{ padding: "14px 16px", color: "#94a3b8", fontWeight: 700 }}>Category</th>
              <th style={{ padding: "14px 16px", color: "#94a3b8", fontWeight: 700 }}>Target / Context</th>
              <th style={{ padding: "14px 16px", color: "#94a3b8", fontWeight: 700 }}>Status</th>
              <th style={{ padding: "14px 16px", color: "#94a3b8", fontWeight: 700 }}>Submitted</th>
              <th style={{ padding: "14px 16px", color: "#94a3b8", fontWeight: 700, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: 30, textAlign: "center", color: "#64748b" }}>Loading reports...</td>
              </tr>
            ) : data.items.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 30, textAlign: "center", color: "#64748b" }}>
                  No {activeType} reports found with status '{statusFilter || "all"}'.
                </td>
              </tr>
            ) : (
              data.items.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => setSelectedReport(row)}
                  style={{
                    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                    cursor: "pointer",
                    background: selectedReport?.id === row.id ? "rgba(14, 165, 233, 0.08)" : "transparent"
                  }}
                >
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontWeight: 700, color: "#fff" }}>{row.reporter_name}</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>{row.reporter_email}</div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontWeight: 700, color: "#e2e8f0" }}>{row.category}</span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "#94a3b8" }}>
                    {row.report_type === "coach" ? (
                      <span style={{ color: "#c084fc", fontWeight: 700 }}>Coach: {row.target_user_name || `ID #${row.target_user_id}`}</span>
                    ) : (
                      <span>{row.app_context || "Global App"}</span>
                    )}
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
                          row.status === "resolved"
                            ? "rgba(34, 197, 94, 0.15)"
                            : row.status === "dismissed"
                            ? "rgba(100, 116, 139, 0.2)"
                            : "rgba(239, 68, 68, 0.15)",
                        color:
                          row.status === "resolved"
                            ? "#4ade80"
                            : row.status === "dismissed"
                            ? "#94a3b8"
                            : "#f87171"
                      }}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "#94a3b8" }}>
                    {row.created_at ? new Date(row.created_at).toLocaleDateString() : "N/A"}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setSelectedReport(row)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        background: "rgba(255, 255, 255, 0.08)",
                        border: "none",
                        color: "#38bdf8",
                        fontWeight: 700,
                        cursor: "pointer",
                        fontSize: 12,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4
                      }}
                    >
                      <Eye size={14} /> Review
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Report Detail Modal */}
      {selectedReport && (
        <div className="modal-overlay" onClick={() => setSelectedReport(null)} style={{ zIndex: 9999 }}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 580,
              width: "90%",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: 24,
              borderRadius: 20,
              background: "rgba(15, 23, 42, 0.95)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#fff"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Report Detail #{selectedReport.id}</h3>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>Type: {selectedReport.report_type?.toUpperCase()}</div>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ padding: 14, background: "rgba(255, 255, 255, 0.04)", borderRadius: 12 }}>
                <div style={{ fontSize: 13, color: "#94a3b8" }}>
                  Reporter: <strong style={{ color: "#fff" }}>{selectedReport.reporter_name}</strong> ({selectedReport.reporter_email})
                </div>
                {selectedReport.report_type === "coach" && (
                  <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
                    Reported Coach: <strong style={{ color: "#c084fc" }}>{selectedReport.target_user_name || `ID #${selectedReport.target_user_id}`}</strong>
                  </div>
                )}
                {selectedReport.app_context && (
                  <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
                    App Context/Route: <strong style={{ color: "#38bdf8" }}>{selectedReport.app_context}</strong>
                  </div>
                )}
                <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
                  Category: <strong style={{ color: "#fff" }}>{selectedReport.category}</strong>
                </div>
              </div>

              {/* Description */}
              <div style={{ padding: 14, background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>DESCRIPTION</div>
                <div style={{ fontSize: 14, color: "#fff", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                  {selectedReport.description}
                </div>
              </div>

              {/* Optional Screenshot */}
              {selectedReport.screenshot_url && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>ATTACHED SCREENSHOT</div>
                  <a href={selectedReport.screenshot_url} target="_blank" rel="noreferrer">
                    <img
                      src={selectedReport.screenshot_url}
                      alt="Bug screenshot"
                      style={{ width: "100%", maxHeight: 250, objectFit: "contain", borderRadius: 10, background: "#000" }}
                    />
                  </a>
                </div>
              )}

              {/* Existing Admin Notes if resolved */}
              {selectedReport.admin_notes && (
                <div style={{ padding: 12, background: "rgba(14, 165, 233, 0.12)", borderRadius: 10, color: "#38bdf8", fontSize: 13 }}>
                  <strong>Admin Resolution Notes:</strong> {selectedReport.admin_notes}
                </div>
              )}

              {/* Action Form if open */}
              {selectedReport.status === "open" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#94a3b8", marginBottom: 4 }}>
                      Admin Notes *
                    </label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      rows={3}
                      placeholder="Explain action taken or rationale for dismissal..."
                      style={{
                        width: "100%",
                        padding: 10,
                        borderRadius: 8,
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        color: "#fff",
                        fontSize: 13,
                        outline: "none"
                      }}
                    />
                  </div>

                  {activeType === "coach" && (
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#94a3b8", marginBottom: 4 }}>
                        Action Taken (Optional)
                      </label>
                      <input
                        type="text"
                        value={actionTaken}
                        onChange={(e) => setActionTaken(e.target.value)}
                        placeholder="e.g. Issued warning to coach, suspended coach profile..."
                        style={{
                          width: "100%",
                          padding: 10,
                          borderRadius: 8,
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.15)",
                          color: "#fff",
                          fontSize: 13,
                          outline: "none"
                        }}
                      />
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
                    <button
                      onClick={handleDismiss}
                      disabled={actionLoading}
                      style={{
                        padding: "8px 16px",
                        borderRadius: 10,
                        background: "rgba(100, 116, 139, 0.2)",
                        border: "1px solid rgba(100, 116, 139, 0.4)",
                        color: "#cbd5e1",
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                    >
                      Dismiss Report
                    </button>
                    <button
                      onClick={handleResolve}
                      disabled={actionLoading}
                      style={{
                        padding: "8px 20px",
                        borderRadius: 10,
                        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                        border: "none",
                        color: "#fff",
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                    >
                      Resolve & Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
