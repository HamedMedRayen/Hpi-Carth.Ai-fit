/**
 * Hpi File Export Utility
 * Exports text/markdown content as downloadable .md, .txt, or .pdf files.
 */

export function sanitizeFileName(name, defaultName = "Hpi_Plan") {
  if (!name) return defaultName;
  const clean = name.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_+/g, "_").slice(0, 40);
  return clean || defaultName;
}

export function detectPlanTitle(content, fallback = "Hpi_Plan") {
  if (!content) return fallback;
  const headerMatch = content.match(/^#+\s*([^\n\r]+)/m);
  if (headerMatch && headerMatch[1]) {
    const rawTitle = headerMatch[1].replace(/[*_#`]/g, "").trim();
    return sanitizeFileName(rawTitle, fallback);
  }
  if (/diet|meal|nutrition|calorie/i.test(content)) return "Hpi_Diet_Plan";
  if (/workout|split|routine|training|hypertrophy|exercise/i.test(content)) return "Hpi_Workout_Plan";
  return fallback;
}

export function downloadFile(content, fileName, extension = "md") {
  if (extension === "pdf") {
    return downloadPdf(content, fileName);
  }

  try {
    const mimeType = extension === "md" ? "text/markdown;charset=utf-8" : "text/plain;charset=utf-8";
    const baseName = fileName ? sanitizeFileName(fileName) : detectPlanTitle(content);
    const fullFileName = `${baseName.replace(/\.(md|txt|pdf)$/i, "")}.${extension}`;
    
    // Clean any hidden action blocks from output file if present
    const cleanContent = content.replace(/\[ACTION:\s*\{.*?\}\s*\]/gs, "").trim();
    
    const blob = new Blob([cleanContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fullFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error("File download failed:", err);
    return false;
  }
}

export function downloadPdf(content, fileName) {
  try {
    const baseName = fileName ? sanitizeFileName(fileName) : detectPlanTitle(content);
    const title = baseName.replace(/_/g, " ");
    const bodyHtml = markdownToHtml(content);
    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    const htmlDoc = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${title} - HPI Plan</title>
          <style>
            @page { size: A4 portrait; margin: 16mm; }
            * { box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a;
              line-height: 1.6;
              padding: 10px;
              margin: 0;
            }
            .header-banner {
              border-bottom: 2px solid #06b6d4;
              padding-bottom: 12px;
              margin-bottom: 20px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            .brand-title {
              font-size: 22px;
              font-weight: 900;
              color: #0891b2;
              letter-spacing: -0.5px;
            }
            .brand-sub {
              font-size: 11px;
              color: #64748b;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .date-meta {
              font-size: 11px;
              color: #94a3b8;
              font-weight: 600;
            }
            h1 { font-size: 20px; color: #0f172a; margin: 16px 0 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
            h2 { font-size: 16px; color: #0891b2; margin: 14px 0 6px; }
            h3 { font-size: 14px; color: #334155; margin: 10px 0 4px; }
            p { margin: 0 0 8px 0; font-size: 13px; color: #334155; }
            ul { margin: 6px 0 12px 18px; padding: 0; }
            li { font-size: 13px; color: #334155; margin-bottom: 4px; }
            .spacer { height: 8px; }
            strong { color: #0f172a; }
            code { background: #f1f5f9; padding: 2px 5px; border-radius: 4px; font-family: monospace; font-size: 12px; border: 1px solid #e2e8f0; }
            table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12px; }
            th { background: #f8fafc; color: #0891b2; font-weight: 700; text-align: left; padding: 8px 10px; border: 1px solid #cbd5e1; }
            td { padding: 7px 10px; border: 1px solid #e2e8f0; color: #334155; }
            tr:nth-child(even) td { background: #f8fafc; }
            .footer {
              margin-top: 30px;
              border-top: 1px solid #e2e8f0;
              padding-top: 10px;
              font-size: 10px;
              color: #94a3b8;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="header-banner">
            <div>
              <div class="brand-title">HPI &bull; Performance Plan</div>
              <div class="brand-sub">Generated by Hpi Multi-Modal AI Coach</div>
            </div>
            <div class="date-meta">${today}</div>
          </div>
          <div class="content-body">
            ${bodyHtml}
          </div>
          <div class="footer">
            Generated with HPI &bull; Intelligent Cross-Platform Fitness Tracking & AI Coaching &bull; Confidential
          </div>
          <script>
            window.onload = function() {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    const printIframe = document.createElement("iframe");
    printIframe.style.position = "fixed";
    printIframe.style.right = "0";
    printIframe.style.bottom = "0";
    printIframe.style.width = "0";
    printIframe.style.height = "0";
    printIframe.style.border = "0";
    document.body.appendChild(printIframe);

    const doc = printIframe.contentWindow.document;
    doc.open();
    doc.write(htmlDoc);
    doc.close();

    // Fallback: trigger print on iframe after brief render delay
    setTimeout(() => {
      try {
        printIframe.contentWindow.focus();
        printIframe.contentWindow.print();
      } catch (e) {}
    }, 400);

    setTimeout(() => {
      try {
        document.body.removeChild(printIframe);
      } catch (e) {}
    }, 60000);

    return true;
  } catch (err) {
    console.error("PDF generation failed:", err);
    return false;
  }
}

function formatInlineHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

export function markdownToHtml(md) {
  if (!md) return "";
  const clean = md.replace(/\[ACTION:\s*\{.*?\}\s*\]/gs, "").trim();
  const lines = clean.split("\n");
  let html = "";
  let inTable = false;
  let tableRows = [];
  let inList = false;

  const flushTable = () => {
    if (tableRows.length > 0) {
      html += "<div class='table-wrapper'><table><tbody>";
      tableRows.forEach((r, rI) => {
        const cells = r.split("|").slice(1, -1).map(c => c.trim());
        const isHeader = rI === 0;
        html += "<tr>";
        cells.forEach(c => {
          html += isHeader ? `<th>${formatInlineHtml(c)}</th>` : `<td>${formatInlineHtml(c)}</td>`;
        });
        html += "</tr>";
      });
      html += "</tbody></table></div>";
      tableRows = [];
      inTable = false;
    }
  };

  const flushList = () => {
    if (inList) {
      html += "</ul>";
      inList = false;
    }
  };

  lines.forEach(line => {
    const trimmed = line.trim();

    // Table rows
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      flushList();
      if (trimmed.includes("---")) return;
      inTable = true;
      tableRows.push(trimmed);
      return;
    } else if (inTable) {
      flushTable();
    }

    // List items
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("• ") || /^\d+\.\s+/.test(trimmed)) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      const itemText = trimmed.replace(/^([-*•]|\d+\.)\s+/, "");
      html += `<li>${formatInlineHtml(itemText)}</li>`;
      return;
    } else if (inList) {
      flushList();
    }

    // Headers & paragraphs
    if (trimmed.startsWith("### ")) {
      html += `<h3>${formatInlineHtml(trimmed.slice(4))}</h3>`;
    } else if (trimmed.startsWith("## ")) {
      html += `<h2>${formatInlineHtml(trimmed.slice(3))}</h2>`;
    } else if (trimmed.startsWith("# ")) {
      html += `<h1>${formatInlineHtml(trimmed.slice(2))}</h1>`;
    } else if (trimmed === "") {
      html += "<div class='spacer'></div>";
    } else {
      html += `<p>${formatInlineHtml(trimmed)}</p>`;
    }
  });

  if (inTable) flushTable();
  if (inList) flushList();

  return html;
}

export async function copyToClipboard(content) {
  try {
    const cleanContent = content.replace(/\[ACTION:\s*\{.*?\}\s*\]/gs, "").trim();
    await navigator.clipboard.writeText(cleanContent);
    return true;
  } catch (err) {
    console.error("Clipboard copy failed:", err);
    return false;
  }
}
