import React, { useState } from "react";
import { Download, FileText, Copy, Check, Printer, FileDown } from "lucide-react";
import { downloadFile, downloadPdf, copyToClipboard, detectPlanTitle } from "../../utils/fileExport";

/**
 * Parses and renders Markdown text safely with syntax highlights,
 * tables, headers, and 1-click .md/.txt/.pdf file downloads.
 */
export default function MarkdownMessage({ content, role = "assistant" }) {
  const [copied, setCopied] = useState(false);
  const [downloadedType, setDownloadedType] = useState(null);

  if (!content) return null;

  // Clean hidden action blocks from visual display
  const displayContent = content.replace(/\[ACTION:\s*\{.*?\}\s*\]/gs, "").trim();

  // Check if content looks like a structured plan or long recommendation
  const isPlanOrStructured =
    role === "assistant" &&
    (displayContent.includes("#") ||
      displayContent.includes("|") ||
      displayContent.includes("```") ||
      displayContent.length > 120 ||
      /workout|diet|plan|split|routine|nutrition|calorie|protein/i.test(displayContent));

  const planTitle = detectPlanTitle(displayContent);

  const handleDownload = (ext) => {
    const success = downloadFile(displayContent, planTitle, ext);
    if (success) {
      setDownloadedType(ext);
      setTimeout(() => setDownloadedType(null), 2200);
    }
  };

  const handleCopy = async () => {
    const success = await copyToClipboard(displayContent);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  // Render lines with markdown formatting
  const renderFormattedText = (raw) => {
    // Split by code blocks first
    const parts = raw.split(/(```[\s\S]*?```)/g);

    return parts.map((part, pIdx) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        const lines = part.slice(3, -3).trim().split("\n");
        let lang = "";
        let codeLines = lines;
        if (lines[0] && !lines[0].includes(" ") && lines.length > 1) {
          lang = lines[0].trim();
          codeLines = lines.slice(1);
        }
        const codeText = codeLines.join("\n");

        return (
          <div key={pIdx} className="hpi-codeblock-container">
            <div className="hpi-codeblock-header">
              <span className="hpi-codeblock-lang">{lang || "markdown"}</span>
              <div className="hpi-codeblock-actions">
                <button
                  type="button"
                  className="hpi-codeblock-btn"
                  onClick={() => downloadFile(codeText, planTitle, "md")}
                  title="Download as .md file"
                >
                  <Download size={13} /> .md
                </button>
                <button
                  type="button"
                  className="hpi-codeblock-btn"
                  onClick={() => downloadFile(codeText, planTitle, "txt")}
                  title="Download as .txt file"
                >
                  <FileText size={13} /> .txt
                </button>
                <button
                  type="button"
                  className="hpi-codeblock-btn"
                  onClick={() => downloadPdf(codeText, planTitle)}
                  title="Download / Print as .pdf file"
                >
                  <Printer size={13} /> .pdf
                </button>
                <button
                  type="button"
                  className="hpi-codeblock-btn"
                  onClick={() => copyToClipboard(codeText)}
                  title="Copy code"
                >
                  <Copy size={13} />
                </button>
              </div>
            </div>
            <pre className="hpi-codeblock-pre">
              <code>{codeText}</code>
            </pre>
          </div>
        );
      }

      // Regular text formatting
      return (
        <div key={pIdx} className="hpi-markdown-flow">
          {renderMarkdownLines(part)}
        </div>
      );
    });
  };

  const renderMarkdownLines = (text) => {
    const lines = text.split("\n");
    const rendered = [];
    let inTable = false;
    let tableRows = [];

    const flushTable = (key) => {
      if (tableRows.length > 0) {
        rendered.push(
          <div key={`table-${key}`} className="hpi-table-wrap">
            <table className="hpi-md-table">
              <tbody>
                {tableRows.map((r, rI) => {
                  const cells = r.split("|").slice(1, -1).map((c) => c.trim());
                  const isHeader = rI === 0;
                  return (
                    <tr key={rI} className={isHeader ? "hpi-th-row" : "hpi-tr-row"}>
                      {cells.map((cell, cI) =>
                        isHeader ? (
                          <th key={cI}>{formatInline(cell)}</th>
                        ) : (
                          <td key={cI}>{formatInline(cell)}</td>
                        )
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
        tableRows = [];
        inTable = false;
      }
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      // Table row
      if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
        if (trimmed.includes("---")) {
          // Divider row, ignore
          return;
        }
        inTable = true;
        tableRows.push(trimmed);
        return;
      } else if (inTable) {
        flushTable(idx);
      }

      // Headers
      if (trimmed.startsWith("### ")) {
        rendered.push(
          <h4 key={idx} className="hpi-md-h3">
            {formatInline(trimmed.slice(4))}
          </h4>
        );
      } else if (trimmed.startsWith("## ")) {
        rendered.push(
          <h3 key={idx} className="hpi-md-h2">
            {formatInline(trimmed.slice(3))}
          </h3>
        );
      } else if (trimmed.startsWith("# ")) {
        rendered.push(
          <h2 key={idx} className="hpi-md-h1">
            {formatInline(trimmed.slice(2))}
          </h2>
        );
      } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("• ")) {
        rendered.push(
          <div key={idx} className="hpi-md-li">
            <span className="hpi-bullet">•</span>
            <span>{formatInline(trimmed.replace(/^[-*•]\s+/, ""))}</span>
          </div>
        );
      } else if (/^\d+\.\s+/.test(trimmed)) {
        const numMatch = trimmed.match(/^(\d+\.)\s+(.*)/);
        rendered.push(
          <div key={idx} className="hpi-md-li">
            <span className="hpi-num-bullet">{numMatch ? numMatch[1] : "•"}</span>
            <span>{formatInline(numMatch ? numMatch[2] : trimmed)}</span>
          </div>
        );
      } else if (trimmed === "") {
        rendered.push(<div key={idx} className="hpi-md-spacer" />);
      } else {
        rendered.push(
          <p key={idx} className="hpi-md-p">
            {formatInline(trimmed)}
          </p>
        );
      }
    });

    if (inTable) {
      flushTable("end");
    }

    return rendered;
  };

  // Helper for bold, italic, code
  const formatInline = (str) => {
    if (!str) return "";
    // Split by bold (**text**), inline code (`code`), italic (*text*)
    const tokens = str.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g);
    return tokens.map((token, i) => {
      if (token.startsWith("**") && token.endsWith("**")) {
        return <strong key={i}>{token.slice(2, -2)}</strong>;
      }
      if (token.startsWith("`") && token.endsWith("`")) {
        return (
          <code key={i} className="hpi-inline-code">
            {token.slice(1, -1)}
          </code>
        );
      }
      if (token.startsWith("*") && token.endsWith("*") && token.length > 2) {
        return <em key={i}>{token.slice(1, -1)}</em>;
      }
      return token;
    });
  };

  return (
    <div className="hpi-formatted-message">
      <div className="hpi-msg-body">{renderFormattedText(displayContent)}</div>

      {/* Plan Export Action Bar */}
      {isPlanOrStructured && (
        <div className="hpi-plan-export-bar">
          <div className="hpi-export-label">Export Plan:</div>
          <button
            type="button"
            className={`hpi-export-action-btn ${downloadedType === "md" ? "active" : ""}`}
            onClick={() => handleDownload("md")}
            title="Download formatted Markdown plan"
          >
            {downloadedType === "md" ? <Check size={12} /> : <Download size={12} />}
            <span>{downloadedType === "md" ? "Downloaded .md" : ".md"}</span>
          </button>
          <button
            type="button"
            className={`hpi-export-action-btn ${downloadedType === "txt" ? "active" : ""}`}
            onClick={() => handleDownload("txt")}
            title="Download plain text plan"
          >
            {downloadedType === "txt" ? <Check size={12} /> : <FileText size={12} />}
            <span>{downloadedType === "txt" ? "Downloaded .txt" : ".txt"}</span>
          </button>
          <button
            type="button"
            className={`hpi-export-action-btn ${downloadedType === "pdf" ? "active" : ""}`}
            onClick={() => handleDownload("pdf")}
            title="Download or Print as styled PDF document"
          >
            {downloadedType === "pdf" ? <Check size={12} /> : <Printer size={12} />}
            <span>{downloadedType === "pdf" ? "Opened .pdf" : ".pdf"}</span>
          </button>
          <button
            type="button"
            className={`hpi-export-action-btn ${copied ? "active" : ""}`}
            onClick={handleCopy}
            title="Copy plan to clipboard"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
