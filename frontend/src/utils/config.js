export const API_BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api";

export function resolveBackendUrl(url) {
  if (!url) return url;
  const backendBase = API_BASE_URL.replace("/api", "");

  // Extract and re-bind uploads directory dynamically (handles varying IPs in db)
  if (url.includes("/api/uploads/")) {
    const parts = url.split("/api/uploads/");
    return `${backendBase}/api/uploads/${parts[parts.length - 1]}`;
  }
  if (url.includes("/uploads/")) {
    const parts = url.split("/uploads/");
    return `${backendBase}/api/uploads/${parts[parts.length - 1]}`;
  }

  if (url.includes("localhost:8000")) {
    return url.replace(/https?:\/\/localhost:8000/g, backendBase);
  }
  if (url.startsWith("/")) {
    return `${backendBase}${url}`;
  }
  return url;
}
