import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { X, Bug, AlertTriangle, CheckCircle2, Link as LinkIcon } from "lucide-react";
import { reports } from "../../utils/api";

const BUG_CATEGORIES = [
  "Crash",
  "Incorrect data",
  "UI issue",
  "Other"
];

export default function ReportBugModal({ onClose, onSuccess }) {
  const location = useLocation();
  const [category, setCategory] = useState(BUG_CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const appContext = location.pathname;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setError("Please describe the bug or issue.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await reports.submitBugReport(
        category,
        description.trim(),
        screenshotUrl.trim() || null,
        appContext
      );
      setSuccess(true);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err) {
      setError(err.message || "Failed to submit bug report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 480,
          width: "90%",
          padding: 24,
          borderRadius: 20,
          background: "rgba(15, 23, 42, 0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          color: "#fff"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(14, 165, 233, 0.15)",
                border: "1px solid rgba(14, 165, 233, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0ea5e9"
              }}
            >
              <Bug size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#fff" }}>Report a Bug</h3>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>Route: {appContext}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 10,
              padding: 6,
              color: "#94a3b8",
              cursor: "pointer"
            }}
          >
            <X size={18} />
          </button>
        </div>

        {success ? (
          <div
            style={{
              padding: 24,
              textAlign: "center",
              background: "rgba(34, 197, 94, 0.1)",
              border: "1px solid rgba(34, 197, 94, 0.3)",
              borderRadius: 14,
              color: "#4ade80"
            }}
          >
            <CheckCircle2 size={36} style={{ marginBottom: 10 }} />
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Bug Report Submitted</div>
            <div style={{ fontSize: 13, color: "#cbd5e1" }}>
              Thank you for helping us improve HPI. Our technical team is on it!
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {error && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "#f87171",
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  gap: 8
                }}
              >
                <AlertTriangle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>
                Bug Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#fff",
                  fontSize: 14,
                  outline: "none"
                }}
              >
                {BUG_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} style={{ background: "#0f172a", color: "#fff" }}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>
                Description & Reproduction Steps
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="What went wrong? Describe what you were trying to do..."
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 10,
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#fff",
                  fontSize: 14,
                  outline: "none",
                  resize: "vertical",
                  fontFamily: "inherit"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>
                Screenshot / Image URL (Optional)
              </label>
              <div style={{ position: "relative" }}>
                <LinkIcon size={16} style={{ position: "absolute", left: 12, top: 12, color: "#64748b" }} />
                <input
                  type="text"
                  value={screenshotUrl}
                  onChange={(e) => setScreenshotUrl(e.target.value)}
                  placeholder="https://..."
                  style={{
                    width: "100%",
                    padding: "10px 14px 10px 38px",
                    borderRadius: 10,
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#fff",
                    fontSize: 13,
                    outline: "none"
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                style={{
                  padding: "10px 18px",
                  borderRadius: 10,
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: "#cbd5e1",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
                  border: "none",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(14, 165, 233, 0.3)"
                }}
              >
                {loading ? "Submitting..." : "Send Report"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
