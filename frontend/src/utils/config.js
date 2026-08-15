import { Capacitor } from '@capacitor/core';

let verifiedWorkingBaseUrl = null;

function normalizeApiUrl(url) {
  if (!url || !url.trim()) return "";
  let trimmed = url.trim();
  // If user entered https for local port 8000, convert to http to match uvicorn backend
  if (trimmed.startsWith("https://") && (trimmed.includes(":8000") || trimmed.includes("10.0.2.2") || trimmed.includes("127.0.0.1") || trimmed.includes("localhost"))) {
    trimmed = trimmed.replace("https://", "http://");
  }
  return trimmed.endsWith('/api') ? trimmed : `${trimmed.replace(/\/$/, '')}/api`;
}

export function getApiBaseUrl() {
  if (verifiedWorkingBaseUrl) {
    return verifiedWorkingBaseUrl;
  }

  // 1. Check custom_api_url in localStorage
  const customUrl = localStorage.getItem("custom_api_url");
  if (customUrl && customUrl.trim()) {
    return normalizeApiUrl(customUrl);
  }

  // 2. Check environment variable
  if (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL.trim()) {
    return normalizeApiUrl(process.env.REACT_APP_API_URL);
  }

  // 3. Defaults based on platform
  const isNativeAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  if (isNativeAndroid) {
    // Default to 127.0.0.1 for USB debugging (via adb reverse tcp:8000 tcp:8000)
    return "http://127.0.0.1:8000/api";
  }

  return "http://127.0.0.1:8000/api";
}

export function setVerifiedWorkingBaseUrl(url) {
  if (!url) return;
  verifiedWorkingBaseUrl = normalizeApiUrl(url);
}

export const API_BASE_URL = getApiBaseUrl();

export function getCandidateApiUrls() {
  const candidates = [];
  
  const customUrl = localStorage.getItem("custom_api_url");
  if (customUrl && customUrl.trim()) {
    candidates.push(normalizeApiUrl(customUrl));
  }

  if (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL.trim()) {
    candidates.push(normalizeApiUrl(process.env.REACT_APP_API_URL));
  }

  candidates.push("http://127.0.0.1:8000/api");
  candidates.push("http://10.0.2.2:8000/api");
  candidates.push("http://localhost:8000/api");

  return Array.from(new Set(candidates.filter(Boolean)));
}

export function resolveBackendUrl(url) {
  if (!url) return url;
  const currentBase = getApiBaseUrl();
  const backendBase = currentBase.replace(/\/api\/?$/, "");

  // Extract and re-bind uploads directory dynamically
  if (url.includes("/api/uploads/")) {
    const parts = url.split("/api/uploads/");
    return `${backendBase}/api/uploads/${parts[parts.length - 1]}`;
  }
  if (url.includes("/uploads/")) {
    const parts = url.split("/uploads/");
    return `${backendBase}/api/uploads/${parts[parts.length - 1]}`;
  }

  if (url.includes("localhost:8000") || url.includes("127.0.0.1:8000") || url.includes("10.0.2.2:8000")) {
    return url.replace(/https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2):8000/g, backendBase);
  }
  if (url.startsWith("/")) {
    return `${backendBase}${url}`;
  }
  return url;
}
