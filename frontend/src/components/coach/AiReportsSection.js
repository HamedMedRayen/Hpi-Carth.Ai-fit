import React, { useState, useEffect, useRef } from "react";
import * as LucideIcons from "lucide-react";
import { api } from "../../utils/api";
import { resolveBackendUrl } from "../../utils/config";

const Sparkles = LucideIcons.Sparkles || LucideIcons.Activity || (() => null);
const FileText = LucideIcons.FileText || LucideIcons.Activity || (() => null);
const Brain = LucideIcons.Brain || LucideIcons.Activity || (() => null);
const ArrowRight = LucideIcons.ArrowRight || LucideIcons.Activity || (() => null);
const ShieldCheck = LucideIcons.ShieldCheck || LucideIcons.Activity || (() => null);
const Download = LucideIcons.Download || LucideIcons.Activity || (() => null);
const Copy = LucideIcons.Copy || LucideIcons.Activity || (() => null);
const Check = LucideIcons.Check || LucideIcons.Activity || (() => null);
const Users = LucideIcons.Users || LucideIcons.Activity || (() => null);
const AlertCircle = LucideIcons.AlertCircle || LucideIcons.Activity || (() => null);
const RefreshCw = LucideIcons.RefreshCw || LucideIcons.Activity || (() => null);
const Printer = LucideIcons.Printer || LucideIcons.Activity || (() => null);
const Zap = LucideIcons.Zap || LucideIcons.Activity || (() => null);
const TrendingUp = LucideIcons.TrendingUp || LucideIcons.Activity || (() => null);
const Sliders = LucideIcons.Sliders || LucideIcons.Activity || (() => null);
const Activity = LucideIcons.Activity || (() => null);
const Dumbbell = LucideIcons.Dumbbell || LucideIcons.Activity || (() => null);
const Moon = LucideIcons.Moon || LucideIcons.Activity || (() => null);
const HeartPulse = LucideIcons.HeartPulse || LucideIcons.Activity || (() => null);
const MessageSquare = LucideIcons.MessageSquare || LucideIcons.Activity || (() => null);

const PRESET_SHORTCUTS = [
  {
    token: "Weekly Volume & Compliance Check",
    iconName: "TrendingUp",
    label: "Weekly Volume Check",
    desc: "Analyze volume progression, sets, and exercise consistency."
  },
  {
    token: "Injury & Recovery Risk Analysis",
    iconName: "HeartPulse",
    label: "Injury & Recovery Risk",
    desc: "Evaluate active injuries, fatigue levels, and sleep deficit."
  },
  {
    token: "Macro Target Compliance Summary",
    iconName: "Sliders",
    label: "Macro Compliance Summary",
    desc: "Review calorie & macro adherence against target goals."
  },
  {
    token: "Pre-Competition Strength Readiness",
    iconName: "Zap",
    label: "Strength & Peak Readiness",
    desc: "Assess top PRs, estimated 1RMs, and heavy set fatigue."
  }
];

export default function AiReportsSection() {
  const [athletes, setAthletes] = useState([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState("");
  const [promptText, setPromptText] = useState("");
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [loadingAthletes, setLoadingAthletes] = useState(true);
  
  // Generation State
  const [generating, setGenerating] = useState(false);
  const [reportResult, setReportResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Real-Time Feedback Refinement State
  const [coachFeedbackInput, setCoachFeedbackInput] = useState("");
  const [refining, setRefining] = useState(false);
  const [appliedFeedbacks, setAppliedFeedbacks] = useState([]);

  const reportRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    setLoadingAthletes(true);
    api.getMyAthletes()
      .then(res => {
        if (!isMounted) return;
        const active = (Array.isArray(res) ? res : []).filter(a => a.status === 'active');
        setAthletes(active);
        if (active.length > 0) {
          setSelectedAthleteId(active[0].athlete_id);
        }
      })
      .catch(err => {
        console.error("Failed to load roster athletes for AI report:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingAthletes(false);
      });
    return () => { isMounted = false; };
  }, []);

  const handleSelectPreset = (shortcut) => {
    setSelectedPreset(shortcut.token);
    setPromptText(prev => {
      if (prev.includes(shortcut.token)) return prev;
      return prev ? `${prev} [Focus: ${shortcut.token}]` : `Focus analysis on: ${shortcut.token}`;
    });
  };

  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    if (!selectedAthleteId) {
      setError("Please select an active athlete from your roster.");
      return;
    }

    setError(null);
    setGenerating(true);
    setReportResult(null);

    try {
      const payload = {
        prompt: promptText,
        preset_token: selectedPreset
      };

      const res = await api.generateAthleteAiReport(selectedAthleteId, payload);
      if (res && res.report) {
        setReportResult(res);
      } else {
        throw new Error("Invalid AI report response.");
      }
    } catch (err) {
      console.error("AI Report generation failed:", err);
      setError(err.message || "Failed to generate AI athlete report. Check Groq connection.");
    } finally {
      setGenerating(false);
    }
  };

  const stripEmojis = (str) => {
    if (!str) return "";
    return str.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, "");
  };

  const handleCopy = () => {
    if (!reportResult?.report) return;
    navigator.clipboard.writeText(stripEmojis(reportResult.report));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadPdf = () => {
    if (!reportRef.current || !reportResult) return;
    const printWindow = window.open('', '_blank');
    const athleteName = reportResult.athlete_name || "Athlete";
    const dateStr = new Date(reportResult.generated_at || Date.now()).toLocaleDateString();

    const cleanHtml = stripEmojis(reportRef.current.innerHTML);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Hpi Performance Report - ${athleteName}</title>
          <style>
            @media print {
              @page { margin: 15mm; size: A4; }
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; background: #fff; }
            }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 36px; color: #0f172a; line-height: 1.6; max-width: 800px; margin: 0 auto; }
            .header-banner { border-bottom: 2px solid #06b6d4; padding-bottom: 12px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
            .title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0; }
            .subtitle { font-size: 12px; color: #64748b; margin-top: 4px; }
            h2 { color: #0f172a; font-weight: 800; font-size: 17px; margin-top: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
            h3 { color: #0284c7; font-weight: 700; font-size: 14px; margin-top: 16px; }
            h4 { color: #0891b2; font-weight: 700; font-size: 13px; margin-top: 12px; }
            p, li { font-size: 13px; color: #334155; }
            ul { padding-left: 20px; }
            button { display: none !important; }
          </style>
        </head>
        <body>
          <div class="header-banner">
            <div>
              <div class="title">HPI Performance & Strength Synthesis</div>
              <div class="subtitle">Client Roster Report: ${athleteName} • Date: ${dateStr}</div>
            </div>
          </div>
          <div>
            ${cleanHtml}
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleRefineWithFeedback = async (e) => {
    if (e) e.preventDefault();
    if (!coachFeedbackInput.trim() || !selectedAthleteId || !reportResult) return;

    const feedbackText = coachFeedbackInput.trim();
    setRefining(true);
    setError(null);

    try {
      const payload = {
        prompt: promptText,
        preset_token: selectedPreset,
        coach_feedback: feedbackText,
        previous_report: reportResult.report
      };

      const res = await api.generateAthleteAiReport(selectedAthleteId, payload);
      if (res && res.report) {
        setReportResult(res);
        setAppliedFeedbacks(prev => [...prev, feedbackText]);
        setCoachFeedbackInput("");
      } else {
        throw new Error("Failed to refine report.");
      }
    } catch (err) {
      console.error("Failed to refine report with feedback:", err);
      setError(err.message || "Failed to refine AI report with coach feedback.");
    } finally {
      setRefining(false);
    }
  };

  const selectedAthlete = athletes.find(a => String(a.athlete_id) === String(selectedAthleteId));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: "8px 0" }}>
      {/* Top Banner */}
      <div style={{
        background: "linear-gradient(135deg, rgba(168, 85, 247, 0.14) 0%, rgba(6, 182, 212, 0.1) 100%)",
        border: "1px solid rgba(168, 85, 247, 0.3)",
        borderRadius: 24,
        padding: 28,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 20
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            background: "rgba(168, 85, 247, 0.2)",
            border: "1px solid rgba(168, 85, 247, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#c084fc",
          }}>
            <Sparkles size={28} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-0.5px" }}>
              AI Report Agent — Groq LLM Synthesis
            </div>
            <div style={{ fontSize: 13, color: "var(--color-text-2)", marginTop: 4 }}>
              Zero-hallucination, data-backed strength & conditioning reports powered by Llama-3.3-70b.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
            borderRadius: 10, background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.08)",
            fontSize: 12, color: "var(--color-text-2)"
          }}>
            <ShieldCheck size={14} style={{ color: "#c084fc" }} /> Grounded S&C Directives
          </div>
        </div>
      </div>

      {/* Main Generator Workspace Shell */}
      <div style={{
        background: "var(--bg-glass, rgba(15, 23, 42, 0.6))",
        border: "1px solid var(--border-card, rgba(255, 255, 255, 0.08))",
        borderRadius: 24,
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 20,
        backdropFilter: "blur(16px)"
      }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 14 }}>
          <Brain size={18} style={{ color: "#c084fc" }} />
          Athlete Report Configuration
        </div>

        {error && (
          <div style={{
            background: "rgba(239, 68, 68, 0.1)", border: "1px solid #ef4444",
            borderRadius: 12, padding: "12px 16px", color: "#fca5a5", fontSize: 13,
            display: "flex", alignItems: "center", gap: 10
          }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {/* Configuration Controls Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 20 }}>
          {/* Left: Athlete Selector & Presets */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: "var(--color-text-3)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                Select Roster Athlete
              </label>
              {loadingAthletes ? (
                <div style={{ fontSize: 12, color: "var(--color-text-3)" }}>Loading roster...</div>
              ) : (
                <select
                  value={selectedAthleteId}
                  onChange={e => setSelectedAthleteId(e.target.value)}
                  style={{
                    width: "100%", background: "var(--color-surface-h)", border: "1px solid var(--border-card)",
                    borderRadius: 12, padding: "10px 14px", color: "#fff", fontSize: 13, outline: "none", fontWeight: 700
                  }}
                >
                  {athletes.length === 0 ? (
                    <option value="">No active athletes on roster</option>
                  ) : (
                    athletes.map(a => (
                      <option key={a.athlete_id} value={a.athlete_id}>
                        {a.name || a.email} ({a.experience?.toUpperCase() || 'INTERMEDIATE'})
                      </option>
                    ))
                  )}
                </select>
              )}
            </div>

            {/* Shortcut Chips */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: "var(--color-text-3)", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
                Analysis Shortcut Presets
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {PRESET_SHORTCUTS.map(sc => {
                  const isSelected = selectedPreset === sc.token;
                  return (
                    <div
                      key={sc.token}
                      onClick={() => handleSelectPreset(sc)}
                      style={{
                        background: isSelected ? "rgba(168, 85, 247, 0.15)" : "rgba(255,255,255,0.02)",
                        border: isSelected ? "1px solid #c084fc" : "1px solid var(--border-card)",
                        borderRadius: 12,
                        padding: "10px 12px",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        display: "flex",
                        alignItems: "center",
                        gap: 10
                      }}
                    >
                      <div style={{ color: isSelected ? "#c084fc" : "var(--color-text-3)", display: "flex", alignItems: "center" }}>
                        {sc.iconName === "TrendingUp" && <TrendingUp size={16} />}
                        {sc.iconName === "HeartPulse" && <HeartPulse size={16} />}
                        {sc.iconName === "Sliders" && <Sliders size={16} />}
                        {sc.iconName === "Zap" && <Zap size={16} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: isSelected ? "#c084fc" : "#fff" }}>
                          {sc.label}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--color-text-3)", marginTop: 2 }}>
                          {sc.desc}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Custom Directive & Generate Button */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: "var(--color-text-3)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                Custom Coach Prompt & Directives (Optional)
              </label>
              <textarea
                rows={6}
                placeholder="e.g. Compare squat volume progress over the last 3 weeks against sleep quality deficit. Provide a specific deload recommendation if fatigue is high."
                value={promptText}
                onChange={e => setPromptText(e.target.value)}
                style={{
                  width: "100%", background: "var(--color-surface-h)", border: "1px solid var(--border-card)",
                  borderRadius: 14, padding: "12px 14px", color: "#fff", fontSize: 13, outline: "none",
                  resize: "vertical", fontFamily: "inherit", boxSizing: "border-box", lineHeight: 1.5
                }}
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating || !selectedAthleteId}
              style={{
                background: "linear-gradient(135deg, #a855f7 0%, #06b6d4 100%)",
                border: "none",
                borderRadius: 14,
                padding: "14px 24px",
                color: "#fff",
                fontSize: 14,
                fontWeight: 900,
                cursor: generating ? "wait" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                boxShadow: "0 4px 16px rgba(168, 85, 247, 0.3)",
                transition: "all 0.2s ease"
              }}
            >
              {generating ? (
                <>
                  <RefreshCw size={18} className="spin" /> Synthesizing Athlete Data with Groq LLM...
                </>
              ) : (
                <>
                  <Sparkles size={18} /> Generate AI Athlete Report
                </>
              )}
            </button>
          </div>
        </div>

        {/* GENERATED REPORT RESULT CONTAINER */}
        {reportResult && (
          <div style={{
            marginTop: 16,
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(168, 85, 247, 0.3)",
            borderRadius: 20,
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 20,
            animation: "fadeIn 0.3s ease-out"
          }}>
            {/* Report Toolbar */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
              paddingBottom: 14,
              flexWrap: "wrap",
              gap: 12
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <FileText size={20} style={{ color: "#c084fc" }} />
                <div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: "#fff" }}>
                    Generated Report for {selectedAthlete?.name || "Athlete"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-text-3)" }}>
                    Powered by Groq Llama-3.3-70b-versatile
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={handleCopy}
                  style={{
                    background: copied ? "rgba(34, 197, 94, 0.2)" : "rgba(255, 255, 255, 0.04)",
                    border: copied ? "1px solid #22c55e" : "1px solid var(--border-card)",
                    color: copied ? "#4ade80" : "#fff",
                    borderRadius: 10,
                    padding: "8px 14px",
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6
                  }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? "Copied!" : "Copy Report"}
                </button>

                <button
                  onClick={handleDownloadPdf}
                  style={{
                    background: "rgba(6, 182, 212, 0.12)",
                    border: "1px solid var(--aura-cyan)",
                    color: "var(--aura-cyan)",
                    borderRadius: 10,
                    padding: "8px 14px",
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6
                  }}
                >
                  <Download size={14} /> Download PDF Report
                </button>
              </div>
            </div>

            {/* Markdown Document Content */}
            <div
              ref={reportRef}
              style={{
                fontSize: 13,
                lineHeight: 1.7,
                color: "var(--color-text)",
                padding: "8px 0"
              }}
            >
              {stripEmojis(reportResult.report).split('\n').map((line, idx) => {
                if (line.startsWith('# ')) {
                  return <h1 key={idx} style={{ fontSize: 20, fontWeight: 900, color: "#fff", borderBottom: "2px solid #06b6d4", paddingBottom: 6, margin: "16px 0 12px" }}>{line.replace('# ', '')}</h1>;
                }
                if (line.startsWith('## ')) {
                  return <h2 key={idx} style={{ fontSize: 16, fontWeight: 800, color: "#c084fc", margin: "20px 0 8px" }}>{line.replace('## ', '')}</h2>;
                }
                if (line.startsWith('### ')) {
                  return <h3 key={idx} style={{ fontSize: 14, fontWeight: 800, color: "#38bdf8", margin: "14px 0 6px" }}>{line.replace('### ', '')}</h3>;
                }
                if (line.startsWith('- ') || line.startsWith('* ')) {
                  return (
                    <li key={idx} style={{ marginLeft: 16, marginBottom: 4 }}>
                      {line.substring(2)}
                    </li>
                  );
                }
                if (!line.trim()) return <div key={idx} style={{ height: 8 }} />;
                return <p key={idx} style={{ margin: "4px 0" }}>{line}</p>;
              })}
            </div>

            {/* Data Points Analyzed Transparency Footer */}
            {reportResult.data_transparency && (
              <div style={{
                background: "rgba(6, 182, 212, 0.05)",
                border: "1px solid rgba(6, 182, 212, 0.2)",
                borderRadius: 14,
                padding: 14,
                fontSize: 11,
                color: "var(--color-text-2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <ShieldCheck size={16} color="var(--aura-cyan)" />
                  <span style={{ fontWeight: 800, color: "#fff" }}>Data Grounding Transparency:</span>
                </div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontWeight: 700 }}>
                  <span>
                    Workouts: {reportResult.data_transparency.workouts_analyzed > 0 ? (
                      <><strong>{reportResult.data_transparency.workouts_analyzed}</strong> ({Math.round(reportResult.data_transparency.total_volume_kg).toLocaleString()} kg)</>
                    ) : (
                      <span style={{ color: "var(--color-text-3)", fontWeight: 500 }}>No workouts logged</span>
                    )}
                  </span>
                  <span>
                    Nutrition: {reportResult.data_transparency.nutrition_days_analyzed > 0 ? (
                      <><strong>{reportResult.data_transparency.nutrition_days_analyzed}</strong> days</>
                    ) : (
                      <span style={{ color: "var(--color-text-3)", fontWeight: 500 }}>No nutrition logs</span>
                    )}
                  </span>
                  <span>
                    Sleep: {reportResult.data_transparency.sleep_nights_analyzed > 0 ? (
                      <><strong>{reportResult.data_transparency.sleep_nights_analyzed}</strong> nights</>
                    ) : (
                      <span style={{ color: "var(--color-text-3)", fontWeight: 500 }}>No sleep logs</span>
                    )}
                  </span>
                  <span>
                    Active Injuries: {reportResult.data_transparency.active_injuries > 0 ? (
                      <strong>{reportResult.data_transparency.active_injuries}</strong>
                    ) : (
                      <span style={{ color: "var(--color-text-3)", fontWeight: 500 }}>None active</span>
                    )}
                  </span>
                </div>
              </div>
            )}

            {/* Real-time Coach Feedback & Report Refinement Panel */}
            <div style={{
              background: "rgba(168, 85, 247, 0.06)",
              border: "1px solid rgba(168, 85, 247, 0.25)",
              borderRadius: 16,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 14
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#c084fc", display: "flex", alignItems: "center", gap: 8 }}>
                  <MessageSquare size={16} /> Real-Time Coach Feedback & Report Refinement
                </div>
                <span style={{ fontSize: 11, color: "var(--color-text-3)" }}>
                  Feedback instantly updates report & persists rule permanently for LLM.
                </span>
              </div>

              {appliedFeedbacks.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {appliedFeedbacks.map((fb, idx) => (
                    <span key={idx} style={{
                      fontSize: 11, fontWeight: 700, background: "rgba(34, 197, 94, 0.1)",
                      border: "1px solid rgba(34, 197, 94, 0.25)", color: "#4ade80",
                      padding: "4px 10px", borderRadius: 8, display: "flex", alignItems: "center", gap: 4
                    }}>
                      <Check size={12} /> Refinement Applied: "{fb}"
                    </span>
                  ))}
                </div>
              )}

              <form onSubmit={handleRefineWithFeedback} style={{ display: "flex", gap: 10 }}>
                <input
                  type="text"
                  placeholder="Enter correction or directive (e.g. 'Swap leg press for extensions due to knee pain', 'Reduce volume by 20%')..."
                  value={coachFeedbackInput}
                  onChange={e => setCoachFeedbackInput(e.target.value)}
                  style={{
                    flex: 1,
                    background: "rgba(0, 0, 0, 0.3)",
                    border: "1px solid var(--border-card)",
                    borderRadius: 12,
                    padding: "12px 16px",
                    color: "#fff",
                    fontSize: 13,
                    outline: "none"
                  }}
                />
                <button
                  type="submit"
                  disabled={refining || !coachFeedbackInput.trim()}
                  style={{
                    background: "linear-gradient(135deg, #a855f7 0%, #06b6d4 100%)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 12,
                    padding: "0 20px",
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: refining || !coachFeedbackInput.trim() ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    opacity: refining || !coachFeedbackInput.trim() ? 0.6 : 1,
                    whiteSpace: "nowrap"
                  }}
                >
                  {refining ? (
                    <>
                      <RefreshCw size={14} className="spin-slow" />
                      Refining Report...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      Refine & Re-Generate
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
