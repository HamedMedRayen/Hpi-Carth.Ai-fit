import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles, FileText, Brain, ArrowRight, ShieldCheck, Download,
  Copy, Check, Users, AlertCircle, RefreshCw, Printer, Zap,
  TrendingUp, Sliders, Activity, Dumbbell, Moon, HeartPulse,
  Info, ChevronRight, MessageSquare, Filter, Layers
} from "lucide-react";
import { api } from "../../utils/api";
import { resolveBackendUrl } from "../../utils/config";

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

// Helper to format inline markdown text (bold, code, reliability pills)
function renderInlineText(text) {
  if (!text) return null;

  const regex = /(\*\*.*?\*\*|`.*?`)/g;
  const tokens = text.split(regex);

  return tokens.map((tok, i) => {
    if (!tok) return null;

    if (tok.startsWith('**') && tok.endsWith('**')) {
      const content = tok.slice(2, -2).trim();

      if (content === "HIGH") {
        return (
          <span key={i} style={{
            background: "rgba(34, 197, 94, 0.2)",
            color: "#4ade80",
            border: "1px solid rgba(34, 197, 94, 0.4)",
            padding: "2px 8px",
            borderRadius: 6,
            fontWeight: 800,
            fontSize: "0.85em",
            margin: "0 2px",
            display: "inline-block"
          }}>
            HIGH
          </span>
        );
      }
      if (content === "MODERATE") {
        return (
          <span key={i} style={{
            background: "rgba(245, 158, 11, 0.2)",
            color: "#fbbf24",
            border: "1px solid rgba(245, 158, 11, 0.4)",
            padding: "2px 8px",
            borderRadius: 6,
            fontWeight: 800,
            fontSize: "0.85em",
            margin: "0 2px",
            display: "inline-block"
          }}>
            MODERATE
          </span>
        );
      }
      if (content === "LOW") {
        return (
          <span key={i} style={{
            background: "rgba(239, 68, 68, 0.2)",
            color: "#fca5a5",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            padding: "2px 8px",
            borderRadius: 6,
            fontWeight: 800,
            fontSize: "0.85em",
            margin: "0 2px",
            display: "inline-block"
          }}>
            LOW
          </span>
        );
      }
      if (content === "NO DATA") {
        return (
          <span key={i} style={{
            background: "rgba(148, 163, 184, 0.2)",
            color: "#cbd5e1",
            border: "1px solid rgba(148, 163, 184, 0.4)",
            padding: "2px 8px",
            borderRadius: 6,
            fontWeight: 800,
            fontSize: "0.85em",
            margin: "0 2px",
            display: "inline-block"
          }}>
            NO DATA
          </span>
        );
      }

      return <strong key={i} style={{ color: "#fff", fontWeight: 800 }}>{content}</strong>;
    }

    if (tok.startsWith('`') && tok.endsWith('`')) {
      const content = tok.slice(1, -1);
      return (
        <code key={i} style={{
          background: "rgba(255, 255, 255, 0.08)",
          color: "#38bdf8",
          padding: "2px 6px",
          borderRadius: 6,
          fontFamily: "monospace",
          fontSize: "0.9em"
        }}>
          {content}
        </code>
      );
    }

    // Process inline reliability badges in standard text
    if (tok.includes("HIGH") || tok.includes("MODERATE") || tok.includes("LOW") || tok.includes("NO DATA")) {
      const subParts = tok.split(/(HIGH|MODERATE|LOW|NO DATA)/g);
      return subParts.map((sub, j) => {
        if (sub === "HIGH") {
          return (
            <span key={`${i}-${j}`} style={{
              background: "rgba(34, 197, 94, 0.2)",
              color: "#4ade80",
              border: "1px solid rgba(34, 197, 94, 0.4)",
              padding: "2px 8px",
              borderRadius: 6,
              fontWeight: 800,
              fontSize: "0.85em",
              margin: "0 2px",
              display: "inline-block"
            }}>
              HIGH
            </span>
          );
        }
        if (sub === "MODERATE") {
          return (
            <span key={`${i}-${j}`} style={{
              background: "rgba(245, 158, 11, 0.2)",
              color: "#fbbf24",
              border: "1px solid rgba(245, 158, 11, 0.4)",
              padding: "2px 8px",
              borderRadius: 6,
              fontWeight: 800,
              fontSize: "0.85em",
              margin: "0 2px",
              display: "inline-block"
            }}>
              MODERATE
            </span>
          );
        }
        if (sub === "LOW") {
          return (
            <span key={`${i}-${j}`} style={{
              background: "rgba(239, 68, 68, 0.2)",
              color: "#fca5a5",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              padding: "2px 8px",
              borderRadius: 6,
              fontWeight: 800,
              fontSize: "0.85em",
              margin: "0 2px",
              display: "inline-block"
            }}>
              LOW
            </span>
          );
        }
        if (sub === "NO DATA") {
          return (
            <span key={`${i}-${j}`} style={{
              background: "rgba(148, 163, 184, 0.2)",
              color: "#cbd5e1",
              border: "1px solid rgba(148, 163, 184, 0.4)",
              padding: "2px 8px",
              borderRadius: 6,
              fontWeight: 800,
              fontSize: "0.85em",
              margin: "0 2px",
              display: "inline-block"
            }}>
              NO DATA
            </span>
          );
        }
        return sub;
      });
    }

    return tok;
  });
}

// Executive Rich Markdown Document Component
function ExecutiveReportDocument({ markdown }) {
  if (!markdown) return null;

  const lines = markdown.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Detect Markdown Tables (handles blank lines inserted between table rows)
    if (trimmed.startsWith('|')) {
      const tableLines = [];
      let tempI = i;
      while (tempI < lines.length) {
        const l = lines[tempI].trim();
        if (l.startsWith('|')) {
          tableLines.push(l);
          tempI++;
        } else if (l === '' && tempI + 1 < lines.length && lines[tempI + 1].trim().startsWith('|')) {
          // Skip blank line between table rows
          tempI++;
        } else {
          break;
        }
      }

      if (tableLines.length >= 2) {
        const parseRow = (r) => r.split('|').map(cell => cell.trim()).filter((cell, idx, arr) => idx > 0 && idx < arr.length - 1);
        const headers = parseRow(tableLines[0]);
        const rowStartIndex = (tableLines.length > 1 && tableLines[1].includes('---')) ? 2 : 1;
        const rows = tableLines.slice(rowStartIndex).map(parseRow);

        elements.push(
          <div key={`table-${tempI}`} style={{ overflowX: "auto", margin: "18px 0" }}>
            <table style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: 0,
              background: "rgba(15, 23, 42, 0.6)",
              border: "1px solid rgba(168, 85, 247, 0.2)",
              borderRadius: 16,
              overflow: "hidden",
              fontSize: 12,
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)"
            }}>
              <thead>
                <tr style={{ background: "linear-gradient(90deg, rgba(168, 85, 247, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%)" }}>
                  {headers.map((h, hIdx) => (
                    <th key={hIdx} style={{
                      padding: "14px 16px",
                      textAlign: "left",
                      fontWeight: 800,
                      color: "#c084fc",
                      borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      fontSize: 11
                    }}>
                      {renderInlineText(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rIdx) => (
                  <tr key={rIdx} style={{
                    background: rIdx % 2 === 0 ? "rgba(255, 255, 255, 0.01)" : "rgba(255, 255, 255, 0.035)",
                    transition: "background 0.2s ease"
                  }}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} style={{
                        padding: "12px 16px",
                        borderBottom: rIdx === rows.length - 1 ? "none" : "1px solid rgba(255, 255, 255, 0.05)",
                        color: "var(--color-text)",
                        lineHeight: 1.5
                      }}>
                        {renderInlineText(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        i = tempI;
        continue;
      }
    }

    // 2. Callout Blockquotes (> ! Alert, > ~ Warning, > ? Question, > i Insight)
    if (trimmed.startsWith('>')) {
      const calloutContent = trimmed.replace(/^>\s*/, '');
      let icon = <Info size={20} style={{ color: "#c084fc" }} />;
      let borderColor = "rgba(168, 85, 247, 0.4)";
      let bgColor = "rgba(168, 85, 247, 0.1)";
      let titleColor = "#c084fc";

      if (calloutContent.startsWith('!') || calloutContent.toLowerCase().includes('alert')) {
        icon = <AlertCircle size={20} style={{ color: "#ef4444" }} />;
        borderColor = "rgba(239, 68, 68, 0.5)";
        bgColor = "rgba(239, 68, 68, 0.1)";
        titleColor = "#fca5a5";
      } else if (calloutContent.startsWith('~') || calloutContent.toLowerCase().includes('warning')) {
        icon = <AlertCircle size={20} style={{ color: "#f59e0b" }} />;
        borderColor = "rgba(245, 158, 11, 0.5)";
        bgColor = "rgba(245, 158, 11, 0.1)";
        titleColor = "#fbbf24";
      } else if (calloutContent.startsWith('?') || calloutContent.toLowerCase().includes('question')) {
        icon = <Info size={20} style={{ color: "#06b6d4" }} />;
        borderColor = "rgba(6, 182, 212, 0.5)";
        bgColor = "rgba(6, 182, 212, 0.1)";
        titleColor = "#38bdf8";
      }

      const displayContent = calloutContent.replace(/^(!|~|\?|i)\s*/, '');

      elements.push(
        <div key={`callout-${i}`} style={{
          background: bgColor,
          borderLeft: `4px solid ${titleColor}`,
          borderTop: `1px solid ${borderColor}`,
          borderRight: `1px solid ${borderColor}`,
          borderBottom: `1px solid ${borderColor}`,
          borderRadius: "0 14px 14px 0",
          padding: "16px 20px",
          margin: "16px 0",
          display: "flex",
          gap: 14,
          alignItems: "flex-start",
          boxShadow: "0 4px 16px rgba(0,0,0,0.15)"
        }}>
          <div style={{ marginTop: 2, flexShrink: 0 }}>{icon}</div>
          <div style={{ fontSize: 13, color: "#fff", lineHeight: 1.6, flex: 1 }}>
            {renderInlineText(displayContent)}
          </div>
        </div>
      );
      i++;
      continue;
    }

    // 3. Document Executive Main Title (e.g. EXECUTIVE ATHLETE PERFORMANCE & DATA RELIABILITY REPORT or # EXECUTIVE...)
    if (trimmed.startsWith('# ') || trimmed === "EXECUTIVE ATHLETE PERFORMANCE & DATA RELIABILITY REPORT" || trimmed.toUpperCase().startsWith("EXECUTIVE ATHLETE REPORT")) {
      const titleText = trimmed.replace(/^#\s*/, '');
      elements.push(
        <div key={`title-${i}`} style={{
          background: "linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%)",
          border: "1px solid rgba(168, 85, 247, 0.3)",
          borderRadius: 16,
          padding: "18px 22px",
          margin: "12px 0 20px",
          display: "flex",
          alignItems: "center",
          gap: 14
        }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: "rgba(168, 85, 247, 0.25)",
            border: "1px solid rgba(168, 85, 247, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#c084fc",
            flexShrink: 0
          }}>
            <Brain size={22} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#fff", letterSpacing: "-0.3px" }}>
              {titleText}
            </div>
            <div style={{ fontSize: 11, color: "var(--color-text-2)", marginTop: 2 }}>
              Synthesized Performance Audit & Clinical S&C Directives
            </div>
          </div>
        </div>
      );
      i++;
      continue;
    }

    // 4. Section Headers (e.g., ## 1. Executive Summary or 1. Executive Summary & Reliability Status)
    const isNumberedHeader = /^\d+\.\s+[A-Z]/.test(trimmed);
    const isMarkdownH2 = trimmed.startsWith('## ');

    if (isMarkdownH2 || isNumberedHeader) {
      const headerText = trimmed.replace(/^##\s*/, '');

      let icon = <Activity size={18} style={{ color: "#c084fc" }} />;
      let headerColor = "#c084fc";

      if (headerText.includes("1.") || headerText.toLowerCase().includes("executive summary")) {
        icon = <Brain size={18} style={{ color: "#c084fc" }} />;
      } else if (headerText.includes("2.") || headerText.toLowerCase().includes("audit")) {
        icon = <ShieldCheck size={18} style={{ color: "#06b6d4" }} />;
        headerColor = "#38bdf8";
      } else if (headerText.includes("3.") || headerText.toLowerCase().includes("training")) {
        icon = <TrendingUp size={18} style={{ color: "#a855f7" }} />;
      } else if (headerText.includes("4.") || headerText.toLowerCase().includes("nutrition")) {
        icon = <Sliders size={18} style={{ color: "#fbbf24" }} />;
        headerColor = "#fbbf24";
      } else if (headerText.includes("5.") || headerText.toLowerCase().includes("fatigue") || headerText.toLowerCase().includes("injury")) {
        icon = <HeartPulse size={18} style={{ color: "#ef4444" }} />;
        headerColor = "#fca5a5";
      } else if (headerText.includes("6.") || headerText.toLowerCase().includes("actionable") || headerText.toLowerCase().includes("directives")) {
        icon = <Zap size={18} style={{ color: "#22c55e" }} />;
        headerColor = "#4ade80";
      }

      elements.push(
        <div key={`h2-${i}`} style={{
          margin: "24px 0 14px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "rgba(255, 255, 255, 0.025)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          padding: "12px 16px",
          borderRadius: 14,
          boxShadow: "0 2px 10px rgba(0,0,0,0.15)"
        }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: "rgba(255,255,255,0.05)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            {icon}
          </div>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: headerColor, margin: 0, flex: 1 }}>
            {headerText}
          </h2>
        </div>
      );
      i++;
      continue;
    }

    // 5. Subheaders (### Subtitle)
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${i}`} style={{ fontSize: 14, fontWeight: 800, color: "#38bdf8", margin: "18px 0 8px" }}>
          {trimmed.replace('### ', '')}
        </h3>
      );
      i++;
      continue;
    }

    // 6. Numbered Action Prescription Cards (e.g., 1. **Improve Nutrition Logging**: ...)
    const isDirectiveLine = /^\d+\.\s+\*\*/.test(trimmed);
    if (isDirectiveLine) {
      const numMatch = trimmed.match(/^(\d+)\.\s+\*\*(.*?)\*\*:(.*)/);
      if (numMatch) {
        const num = numMatch[1];
        const title = numMatch[2];
        const desc = numMatch[3];

        elements.push(
          <div key={`directive-${i}`} style={{
            background: "rgba(6, 182, 212, 0.04)",
            border: "1px solid rgba(6, 182, 212, 0.2)",
            borderRadius: 14,
            padding: "14px 18px",
            margin: "10px 0",
            display: "flex",
            gap: 14,
            alignItems: "flex-start",
            transition: "all 0.2s ease"
          }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #a855f7 0%, #06b6d4 100%)",
              color: "#fff",
              fontWeight: 900,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              marginTop: 2
            }}>
              {num}
            </div>
            <div style={{ flex: 1, fontSize: 13, lineHeight: 1.6 }}>
              <div style={{ fontWeight: 800, color: "#fff", fontSize: 14, marginBottom: 4 }}>
                {title}
              </div>
              <div style={{ color: "var(--color-text-2)" }}>
                {renderInlineText(desc)}
              </div>
            </div>
          </div>
        );
        i++;
        continue;
      }
    }

    // 7. Standard Bullet Lists (- Item)
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <div key={`li-${i}`} style={{
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
          margin: "6px 0 6px 12px",
          fontSize: 13,
          color: "var(--color-text)",
          lineHeight: 1.6
        }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#06b6d4", marginTop: 8, flexShrink: 0 }} />
          <div>{renderInlineText(trimmed.substring(2))}</div>
        </div>
      );
      i++;
      continue;
    }

    // 8. Empty line spacing
    if (!trimmed) {
      elements.push(<div key={`space-${i}`} style={{ height: 6 }} />);
      i++;
      continue;
    }

    // 9. Standard Paragraph
    elements.push(
      <p key={`p-${i}`} style={{ margin: "6px 0", fontSize: 13, color: "var(--color-text)", lineHeight: 1.6 }}>
        {renderInlineText(trimmed)}
      </p>
    );
    i++;
  }

  return <div style={{ display: "flex", flexDirection: "column" }}>{elements}</div>;
}

export default function AiReportsSection() {
  const [athletes, setAthletes] = useState([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState("");
  const [promptText, setPromptText] = useState("");
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [loadingAthletes, setLoadingAthletes] = useState(true);

  // Generation & View State
  const [generating, setGenerating] = useState(false);
  const [reportResult, setReportResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState("rendered"); // 'rendered' | 'raw'

  // Refinement Feedback State
  const [coachFeedback, setCoachFeedback] = useState("");
  const [refining, setRefining] = useState(false);
  const [refinedToast, setRefinedToast] = useState(false);

  const reportRef = useRef(null);
  const reportContainerRef = useRef(null);

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
    setRefinedToast(false);

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

  const handleRefineReport = async (overrideFeedback) => {
    const activeDirective = (typeof overrideFeedback === 'string' ? overrideFeedback : coachFeedback).trim();
    if (!activeDirective) {
      setError("Please type a coach directive or choose a quick shortcut to refine the report.");
      return;
    }
    if (!selectedAthleteId || !reportResult?.report) {
      setError("No active report found to refine. Generate a report first.");
      return;
    }

    setRefining(true);
    setError(null);
    setRefinedToast(false);

    try {
      const payload = {
        prompt: promptText || "",
        preset_token: selectedPreset || null,
        coach_feedback: activeDirective,
        previous_report: reportResult.report
      };

      const res = await api.generateAthleteAiReport(selectedAthleteId, payload);
      if (res && res.report) {
        setReportResult(res);
        setCoachFeedback("");
        setRefinedToast(true);
        setTimeout(() => setRefinedToast(false), 6000);

        if (reportContainerRef.current) {
          reportContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } else {
        throw new Error(res?.detail || res?.message || "Server returned an empty refined report.");
      }
    } catch (err) {
      console.error("Failed to refine AI report:", err);
      setError(err.message || "Failed to refine AI report with coach feedback.");
    } finally {
      setRefining(false);
    }
  };

  const handleCopy = () => {
    if (!reportResult?.report) return;
    navigator.clipboard.writeText(reportResult.report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadMd = () => {
    if (!reportResult?.report) return;
    const blob = new Blob([reportResult.report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AI_Athlete_Report_${selectedAthlete?.name || 'Athlete'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    if (!reportRef.current) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Executive Athlete AI Report</title>
          <style>
            body { font-family: 'Inter', -apple-system, sans-serif; padding: 40px; color: #0f172a; line-height: 1.6; }
            h1 { color: #0f172a; border-bottom: 2px solid #06b6d4; padding-bottom: 8px; font-size: 24px; }
            h2 { color: #6b21a8; margin-top: 24px; font-size: 18px; }
            table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px 12px; text-align: left; }
            th { background: #f1f5f9; color: #0f172a; font-weight: bold; }
            .callout { background: #f8fafc; border-left: 4px solid #06b6d4; padding: 12px 16px; margin: 16px 0; border-radius: 4px; }
          </style>
        </head>
        <body>
          ${reportRef.current.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const selectedAthlete = athletes.find(a => String(a.athlete_id) === String(selectedAthleteId));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: "8px 0" }}>
      {/* Top Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 16,
        paddingBottom: 4
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: "rgba(168, 85, 247, 0.15)",
            border: "1px solid rgba(168, 85, 247, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#c084fc",
          }}>
            <Sparkles size={22} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-0.5px" }}>
              Executive AI Athlete Report Engine
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-2)", marginTop: 2 }}>
              Data-grounded, zero-hallucination strength & conditioning dossiers powered by Groq Llama-3.3-70b.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, padding: "6px 12px",
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
          <div
            ref={reportContainerRef}
            style={{
              position: "relative",
              marginTop: 16,
              background: "rgba(15, 23, 42, 0.4)",
              border: "1px solid rgba(168, 85, 247, 0.3)",
              borderRadius: 20,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 20,
              animation: "fadeIn 0.3s ease-out"
            }}
          >
            {/* Refinement Overlay during generation */}
            {refining && (
              <div style={{
                position: "absolute",
                top: 0, left: 0, right: 0, bottom: 0,
                background: "rgba(15, 23, 42, 0.88)",
                backdropFilter: "blur(8px)",
                borderRadius: 20,
                zIndex: 30,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
                padding: 24
              }}>
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: "rgba(168, 85, 247, 0.2)",
                  border: "1px solid rgba(168, 85, 247, 0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#c084fc",
                  boxShadow: "0 0 24px rgba(168, 85, 247, 0.4)"
                }}>
                  <RefreshCw size={28} className="spin" />
                </div>
                <div style={{ fontSize: 16, fontWeight: 900, color: "#fff", textAlign: "center", letterSpacing: "-0.3px" }}>
                  Re-synthesizing AI Report with Head Coach Directives...
                </div>
                <div style={{ fontSize: 12, color: "#c084fc", textAlign: "center", maxWidth: 420, lineHeight: 1.5 }}>
                  Incorporating directive: <em>"{coachFeedback || 'Coach Directives'}"</em>
                </div>
              </div>
            )}

            {/* Executive Report Toolbar */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              paddingBottom: 16,
              flexWrap: "wrap",
              gap: 14
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "rgba(6, 182, 212, 0.15)",
                  border: "1px solid rgba(6, 182, 212, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#06b6d4"
                }}>
                  <FileText size={22} />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                    Report for {selectedAthlete?.name || "Athlete"}
                    <span style={{
                      fontSize: 10,
                      fontWeight: 800,
                      background: "rgba(168, 85, 247, 0.2)",
                      border: "1px solid rgba(168, 85, 247, 0.4)",
                      color: "#c084fc",
                      padding: "2px 8px",
                      borderRadius: 12
                    }}>
                      EXECUTIVE FORMAT
                    </span>
                    {refinedToast && (
                      <span style={{
                        fontSize: 11,
                        fontWeight: 800,
                        background: "rgba(34, 197, 94, 0.2)",
                        border: "1px solid rgba(34, 197, 94, 0.5)",
                        color: "#4ade80",
                        padding: "3px 10px",
                        borderRadius: 12,
                        display: "flex",
                        alignItems: "center",
                        gap: 4
                      }}>
                        <Check size={12} /> Refined with Coach Directives!
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-text-3)", marginTop: 2 }}>
                    Synthesized by Groq Llama-3.3-70b-versatile
                  </div>
                </div>
              </div>

              {/* Toolbar Controls */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {/* View Mode Toggle */}
                <div style={{
                  display: "flex",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: 10,
                  padding: 2
                }}>
                  <button
                    onClick={() => setViewMode("rendered")}
                    style={{
                      background: viewMode === "rendered" ? "rgba(168, 85, 247, 0.3)" : "transparent",
                      color: viewMode === "rendered" ? "#fff" : "var(--color-text-3)",
                      border: "none",
                      borderRadius: 8,
                      padding: "6px 12px",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    Executive View
                  </button>
                  <button
                    onClick={() => setViewMode("raw")}
                    style={{
                      background: viewMode === "raw" ? "rgba(168, 85, 247, 0.3)" : "transparent",
                      color: viewMode === "raw" ? "#fff" : "var(--color-text-3)",
                      border: "none",
                      borderRadius: 8,
                      padding: "6px 12px",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    Markdown
                  </button>
                </div>

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
                  {copied ? "Copied!" : "Copy"}
                </button>

                <button
                  onClick={handleDownloadMd}
                  style={{
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid var(--border-card)",
                    color: "#fff",
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
                  <Download size={14} /> Download .md
                </button>

                <button
                  onClick={handlePrint}
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
                  <Printer size={14} /> Export / Print PDF
                </button>
              </div>
            </div>

            {/* Document Content View */}
            <div ref={reportRef} style={{ padding: "4px 0" }}>
              {viewMode === "rendered" ? (
                <ExecutiveReportDocument markdown={reportResult.report} />
              ) : (
                <textarea
                  readOnly
                  rows={20}
                  value={reportResult.report}
                  style={{
                    width: "100%",
                    background: "rgba(10, 15, 30, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: 12,
                    padding: 16,
                    color: "#38bdf8",
                    fontFamily: "monospace",
                    fontSize: 12,
                    lineHeight: 1.6,
                    resize: "vertical",
                    boxSizing: "border-box"
                  }}
                />
              )}
            </div>

            {/* Data Grounding Transparency Footer */}
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
                  <span style={{ fontWeight: 800, color: "#fff" }}>Data Grounding Transparency Audit:</span>
                </div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontWeight: 700 }}>
                  <span>Workouts: <strong>{reportResult.data_transparency.workouts_analyzed}</strong> ({Math.round(reportResult.data_transparency.total_volume_kg).toLocaleString()} kg)</span>
                  <span>Nutrition: <strong>{reportResult.data_transparency.nutrition_days_analyzed}</strong> days</span>
                  <span>Sleep: <strong>{reportResult.data_transparency.sleep_nights_analyzed}</strong> nights</span>
                  <span>Active Injuries: <strong>{reportResult.data_transparency.active_injuries}</strong></span>
                </div>
              </div>
            )}

            {/* Interactive Coach Refinement Drawer */}
            <div style={{
              background: "rgba(168, 85, 247, 0.06)",
              border: "1px solid rgba(168, 85, 247, 0.2)",
              borderRadius: 16,
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              marginTop: 8
            }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#c084fc", display: "flex", alignItems: "center", gap: 8 }}>
                <MessageSquare size={16} />
                Refine Report with Head Coach Directives
              </div>
              <div style={{ fontSize: 11, color: "var(--color-text-3)" }}>
                Need to adjust volume recommendations or modify fatigue advice? Type your directive below or select a quick shortcut chip to re-synthesize an updated report draft.
              </div>

              {/* Quick Directive Shortcut Chips */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  "Reduce recommended leg/squat working volume by 15%",
                  "Flag lower back tightness and suggest mobility exercises",
                  "Prioritize nutrition logging compliance over calorie changes",
                  "Add strict 48-hour recovery rule between heavy compound sessions"
                ].map((chipText, cIdx) => (
                  <button
                    key={cIdx}
                    onClick={() => {
                      setCoachFeedback(chipText);
                      handleRefineReport(chipText);
                    }}
                    disabled={refining}
                    style={{
                      background: "rgba(168, 85, 247, 0.12)",
                      border: "1px solid rgba(168, 85, 247, 0.3)",
                      borderRadius: 8,
                      padding: "4px 10px",
                      color: "#e9d5ff",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: refining ? "not-allowed" : "pointer",
                      transition: "all 0.15s ease"
                    }}
                  >
                    + {chipText}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input
                  type="text"
                  placeholder="e.g. Reduce recommended squat volume by 15% and flag lower back tightness."
                  value={coachFeedback}
                  onChange={e => setCoachFeedback(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleRefineReport();
                    }
                  }}
                  disabled={refining}
                  style={{
                    flex: 1,
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid var(--border-card)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    color: "#fff",
                    fontSize: 13,
                    outline: "none"
                  }}
                />
                <button
                  onClick={() => handleRefineReport()}
                  disabled={refining || !coachFeedback.trim()}
                  style={{
                    background: "linear-gradient(135deg, #a855f7 0%, #06b6d4 100%)",
                    border: "none",
                    borderRadius: 10,
                    padding: "10px 18px",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: refining || !coachFeedback.trim() ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    opacity: coachFeedback.trim() ? 1 : 0.6
                  }}
                >
                  {refining ? <RefreshCw size={14} className="spin" /> : <Sparkles size={14} />}
                  {refining ? "Refining..." : "Apply & Re-synthesize"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
