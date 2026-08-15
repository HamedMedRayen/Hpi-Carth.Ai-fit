/**
 * Hpi File Export Utility
 * Exports text/markdown content as downloadable .md or .txt files.
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
  try {
    const mimeType = extension === "md" ? "text/markdown;charset=utf-8" : "text/plain;charset=utf-8";
    const baseName = fileName ? sanitizeFileName(fileName) : detectPlanTitle(content);
    const fullFileName = `${baseName.replace(/\.(md|txt)$/i, "")}.${extension}`;
    
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
