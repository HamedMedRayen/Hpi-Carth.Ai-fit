import { Capacitor } from '@capacitor/core';

let verifiedWorkingBaseUrl = null;

export function getApiBaseUrl() {
  if (verifiedWorkingBaseUrl) {
    return verifiedWorkingBaseUrl;
  }

  // 1. Check custom_api_url in localStorage
  const customUrl = localStorage.getItem("custom_api_url");
  if (customUrl && customUrl.trim()) {
    const trimmed = customUrl.trim();
    let resUrl = trimmed.endsWith('/api') ? trimmed : `${trimmed.replace(/\/$/, '')}/api`;
    if (!Capacitor.isNativePlatform() && resUrl.includes("10.0.2.2")) {
      resUrl = resUrl.replace("10.0.2.2", "127.0.0.1");
    }
    return resUrl;
  }

  // 2. Check environment variable
  if (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL.trim()) {
    const envUrl = process.env.REACT_APP_API_URL.trim();
    let formatted = envUrl.endsWith('/api') ? envUrl : `${envUrl.replace(/\/$/, '')}/api`;
    const isNativeAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
    if (isNativeAndroid && (formatted.includes("127.0.0.1") || formatted.includes("localhost"))) {
      formatted = formatted.replace("127.0.0.1", "10.0.2.2").replace("localhost", "10.0.2.2");
    }
    return formatted;
  }

  // 3. Defaults based on platform
  const isNativeAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  if (isNativeAndroid) {
    return "http://10.0.2.2:8000/api";
  }

  return "http://127.0.0.1:8000/api";
}

export function setVerifiedWorkingBaseUrl(url) {
  if (!url) return;
  const formatted = url.endsWith('/api') ? url : `${url.replace(/\/$/, '')}/api`;
  verifiedWorkingBaseUrl = formatted;
}

export const API_BASE_URL = getApiBaseUrl();

export function getCandidateApiUrls() {
  const candidates = [];
  
  const customUrl = localStorage.getItem("custom_api_url");
  if (customUrl && customUrl.trim()) {
    const trimmed = customUrl.trim();
    candidates.push(trimmed.endsWith('/api') ? trimmed : `${trimmed.replace(/\/$/, '')}/api`);
  }

  if (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL.trim()) {
    const envUrl = process.env.REACT_APP_API_URL.trim();
    candidates.push(envUrl.endsWith('/api') ? envUrl : `${envUrl.replace(/\/$/, '')}/api`);
  }

  candidates.push("http://10.0.2.2:8000/api");
  candidates.push("http://127.0.0.1:8000/api");
  candidates.push("http://localhost:8000/api");

  return Array.from(new Set(candidates));
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
