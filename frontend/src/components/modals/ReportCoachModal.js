import React, { useState } from "react";
import { X, Flag, AlertTriangle, CheckCircle2 } from "lucide-react";
import { reports } from "../../utils/api";

const CATEGORIES = [
  "Inappropriate behavior",
  "Unresponsive",
  "Inaccurate advice",
  "Other"
];

export default function ReportCoachModal({ coach, onClose, onSuccess }) {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const coachId = coach?.coach_id || coach?.id || coach?.user_id;
  const coachName = coach?.name || coach?.coach_name || "this coach";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setError("Please describe the issue you encountered.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await reports.submitCoachReport(coachId, category, description.trim());
      setSuccess(true);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err) {
      setError(err.message || "Failed to submit report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!coach) return null;

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
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ef4444"
              }}
            >
              <Flag size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#fff" }}>Report Coach</h3>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>Reporting {coachName}</div>
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
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Report Submitted</div>
            <div style={{ fontSize: 13, color: "#cbd5e1" }}>
              Our administration team will review your report shortly. Thank you.
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
                Issue Category
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
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} style={{ background: "#0f172a", color: "#fff" }}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>
                Detailed Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Provide specific details about your experience..."
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
                  background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                  border: "none",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(239, 68, 68, 0.3)"
                }}
              >
                {loading ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
