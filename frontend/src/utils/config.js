import { Capacitor } from '@capacitor/core';

export function getApiBaseUrl() {
  // Check if a custom server URL is set in localStorage
  const customUrl = localStorage.getItem("custom_api_url");
  if (customUrl && customUrl.trim()) {
    const trimmed = customUrl.trim();
    return trimmed.endsWith('/api') ? trimmed : `${trimmed.replace(/\/$/, '')}/api`;
  }

  let url = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api";

  // On Native Android, 127.0.0.1 or localhost points to the phone/emulator itself.
  // Map loopback addresses to 10.0.2.2 (Android Emulator host alias).
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    if (url.includes("127.0.0.1") || url.includes("localhost")) {
      url = url.replace("127.0.0.1", "10.0.2.2").replace("localhost", "10.0.2.2");
    }
  }

  return url;
}

export const API_BASE_URL = getApiBaseUrl();

export function resolveBackendUrl(url) {
  if (!url) return url;
  const currentBase = getApiBaseUrl();
  const backendBase = currentBase.replace(/\/api\/?$/, "");

  // Extract and re-bind uploads directory dynamically (handles varying IPs in db)
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
