import { Capacitor } from '@capacitor/core';

export function getApiBaseUrl() {
  // Check if a custom server URL is set in localStorage
  const customUrl = localStorage.getItem("custom_api_url");
  if (customUrl && customUrl.trim()) {
    const trimmed = customUrl.trim();
    let resUrl = trimmed.endsWith('/api') ? trimmed : `${trimmed.replace(/\/$/, '')}/api`;
    // If in web browser on PC and customUrl has 10.0.2.2, map back to 127.0.0.1
    if (!Capacitor.isNativePlatform() && resUrl.includes("10.0.2.2")) {
      resUrl = resUrl.replace("10.0.2.2", "127.0.0.1");
    }
    return resUrl;
  }

  let url = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api";

  // ONLY convert to 10.0.2.2 when running in actual Capacitor Native Android app container
  const isNativeAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

  if (isNativeAndroid) {
    if (url.includes("127.0.0.1") || url.includes("localhost")) {
      url = url.replace("127.0.0.1", "10.0.2.2").replace("localhost", "10.0.2.2");
    }
  } else {
    // In web browser (desktop/laptop/emulation), 10.0.2.2 is unreachable, so use 127.0.0.1
    if (url.includes("10.0.2.2")) {
      url = url.replace("10.0.2.2", "127.0.0.1");
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
