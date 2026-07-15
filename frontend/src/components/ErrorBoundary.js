import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

/**
 * Error Boundary — catches React render errors in child components
 * and shows a graceful fallback instead of a white screen.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", padding: 48, textAlign: "center",
            minHeight: this.props.fullPage ? "60vh" : 200,
          }}
        >
          <div
            style={{
              width: 56, height: 56, borderRadius: 16,
              background: "rgba(239, 68, 68, 0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 20,
            }}
          >
            <AlertCircle size={28} color="#ef4444" />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text)", marginBottom: 6 }}>
            {this.props.title || "Something went wrong"}
          </div>
          <div style={{ fontSize: 13, color: "var(--color-text-3)", marginBottom: 20, maxWidth: 320 }}>
            {this.props.message || "This section encountered an error. Try refreshing."}
          </div>
          <button
            onClick={this.handleRetry}
            style={{
              padding: "10px 20px", borderRadius: 12,
              background: "var(--aura-accent)", color: "var(--color-on-accent)",
              border: "none", fontSize: 13, fontWeight: 700,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
              transition: "all 0.2s",
            }}
          >
            <RefreshCw size={14} /> Try Again
          </button>
          {process.env.NODE_ENV === "development" && this.state.error && (
            <pre
              style={{
                marginTop: 20, padding: 16, borderRadius: 10,
                background: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                fontSize: 11, color: "#ef4444", textAlign: "left",
                maxWidth: 500, overflow: "auto", whiteSpace: "pre-wrap",
              }}
            >
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
