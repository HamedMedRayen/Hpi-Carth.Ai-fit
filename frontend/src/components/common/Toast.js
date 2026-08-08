import React, { useState, useEffect, useCallback, useMemo, createContext, useContext } from "react";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

const ICONS = {
  success: <CheckCircle size={18} />,
  error: <AlertCircle size={18} />,
  info: <Info size={18} />,
};

const COLORS = {
  success: { bg: "rgba(16, 185, 129, 0.15)", border: "rgba(16, 185, 129, 0.4)", text: "#10b981" },
  error:   { bg: "rgba(239, 68, 68, 0.15)",  border: "rgba(239, 68, 68, 0.4)",  text: "#ef4444" },
  info:    { bg: "rgba(56, 189, 248, 0.15)",  border: "rgba(56, 189, 248, 0.4)", text: "#38bdf8" },
};

function ToastItem({ toast, onDismiss }) {
  const [exiting, setExiting] = useState(false);
  const colors = COLORS[toast.type] || COLORS.info;

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onDismiss(toast.id), 300);
    }, toast.duration || 3500);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "14px 18px", borderRadius: 14,
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        animation: exiting ? "toast-exit 0.3s ease forwards" : "toast-enter 0.35s cubic-bezier(0.2, 0.8, 0.2, 1) forwards",
        maxWidth: 420,
        width: "100%",
        pointerEvents: "auto",
      }}
    >
      <span style={{ color: colors.text, flexShrink: 0 }}>
        {ICONS[toast.type]}
      </span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)", flex: 1, lineHeight: 1.4 }}>
        {toast.message}
      </span>
      <button
        onClick={() => { setExiting(true); setTimeout(() => onDismiss(toast.id), 300); }}
        style={{
          background: "none", border: "none", cursor: "pointer",
          color: "var(--color-text-3)", padding: 4, flexShrink: 0,
          display: "flex", alignItems: "center",
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info", duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useMemo(() => ({
    show: (msg, type = "info", dur) => addToast(msg, type, dur),
    success: (msg, dur) => addToast(msg, "success", dur),
    error: (msg, dur) => addToast(msg, "error", dur),
    info: (msg, dur) => addToast(msg, "info", dur),
  }), [addToast]);

  // Make toast available globally for non-component code
  useEffect(() => {
    window.__auraToast = toast;
  }, [toast]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast container */}
      <div
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 99999,
          display: "flex", flexDirection: "column-reverse", gap: 10,
          pointerEvents: "none",
        }}
      >
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={removeToast} />
        ))}
      </div>
      <style>{`
        @keyframes toast-enter {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes toast-exit {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to   { opacity: 0; transform: translateY(8px) scale(0.96); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback for components outside provider — use global
    return {
      success: (msg) => window.__auraToast?.success(msg),
      error: (msg) => window.__auraToast?.error(msg),
      info: (msg) => window.__auraToast?.info(msg),
    };
  }
  return ctx;
}

export default ToastProvider;
