import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../utils/auth";
import { HpiLogo } from "../../utils/icons";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import "../styles/mobile.css";

export default function MobileAuthFlow() {
  const navigate = useNavigate();
  const { login, register, loginGoogle } = useAuth();
  
  const [view, setView] = useState("welcome"); 
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("athlete");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e, type) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (type === "login") {
        if (!nickname.trim() || !password) throw new Error("Nickname and password required.");
        await login(nickname, password, navigate);
      } else {
        if (!nickname.trim() || !password || !email.trim()) throw new Error("All fields are required.");
        await register(nickname, password, email, role, navigate);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      await loginGoogle(credentialResponse.credential, navigate);
    } catch {
      setError("Google Login failed.");
    }
  };

  const cosmicBg = {
    background: "radial-gradient(ellipse at top, #1e1b4b 0%, #0f0b2e 35%, #020617 100%)",
  };

  const glassCard = {
    background: "rgba(255, 255, 255, 0.04)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: 20,
    padding: 24,
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    marginBottom: 24,
  };

  const glassInput = {
    width: "100%",
    background: "rgba(255, 255, 255, 0.06)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: "14px 16px",
    fontSize: 16,
    color: "#f1f5f9",
    outline: "none",
    fontFamily: "inherit",
    transition: "border-color 0.2s, box-shadow 0.2s",
  };

  const glassLabel = {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    color: "rgba(255, 255, 255, 0.5)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: 8,
  };

  const accentBtn = {
    width: "100%",
    background: "var(--aura-accent, #6366f1)",
    color: "#ffffff",
    border: "none",
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    fontWeight: 800,
    cursor: "pointer",
    transition: "all 0.2s",
    boxShadow: "0 4px 20px rgba(99, 102, 241, 0.35)",
  };

  const outlineBtn = {
    width: "100%",
    background: "rgba(255, 255, 255, 0.04)",
    color: "#ffffff",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.2s",
    backdropFilter: "blur(8px)",
  };

  if (view === "welcome") {
    return (
      <div className="mobile-auth-container" style={{ ...cosmicBg, justifyContent: "center", alignItems: "center", textAlign: "center" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ color: "var(--aura-accent, #6366f1)" }}>
            <HpiLogo size={80} forceWhite={true} />
          </div>
        </div>
        
        <div style={{ width: "100%", paddingBottom: 40 }}>
          <h1 style={{ color: "#ffffff", fontSize: 32, fontWeight: 800, marginBottom: 12, letterSpacing: "-0.5px" }}>
            Elevate your<br />training journey
          </h1>
          <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 32, lineHeight: 1.5 }}>
            Join HPI to track your performance, log workouts, and achieve your fitness goals.
          </p>
          
          <button style={{ ...accentBtn, marginBottom: 12 }} onClick={() => setView("register")}>
            Start Now
          </button>
          <button style={{ ...outlineBtn, marginBottom: 24 }} onClick={() => setView("login")}>
            Sign In
          </button>

          {/* Direct Google Login */}
          <div style={{ display: "flex", alignItems: "center", margin: "0 0 20px", color: "#64748b", fontSize: 12 }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
            <span style={{ padding: "0 12px" }}>Or continue with</span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ width: "100%", background: "rgba(255,255,255,0.06)", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError("Google Login failed.")}
                theme="filled_black"
                shape="pill"
                width="100%"
              />
            </div>
          </div>
          {error && (
            <div style={{ color: "#ef4444", fontSize: 13, marginTop: 16, textAlign: "center", fontWeight: 600 }}>
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-auth-container" style={{ ...cosmicBg, paddingTop: "env(safe-area-inset-top)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 32, marginTop: 16 }}>
        <button onClick={() => setView("welcome")} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#ffffff", padding: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ArrowLeft size={20} />
        </button>
      </div>

      <h1 style={{ color: "#ffffff", fontSize: 28, fontWeight: 800, margin: "0 0 8px 0" }}>
        {view === "register" ? "Create Account" : "Welcome Back"}
      </h1>
      
      <p style={{ color: "#94a3b8", fontSize: 14, margin: "0 0 32px 0" }}>
        {view === "register" ? (
          <>Already have an account? <span style={{ color: "var(--aura-accent, #6366f1)", fontWeight: 700, cursor: "pointer" }} onClick={() => setView("login")}>Sign In</span></>
        ) : (
          <>Don't have an account? <span style={{ color: "var(--aura-accent, #6366f1)", fontWeight: 700, cursor: "pointer" }} onClick={() => setView("register")}>Sign Up</span></>
        )}
      </p>

      <form onSubmit={(e) => handleSubmit(e, view)} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={glassCard}>
          
          {view === "register" && (
            <div style={{ marginBottom: 16 }}>
              <label style={glassLabel}>Nickname</label>
              <input
                style={glassInput}
                placeholder="e.g. ironathlete"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
            </div>
          )}

          {view === "login" && (
            <div style={{ marginBottom: 16 }}>
              <label style={glassLabel}>Nickname / Email</label>
              <input
                style={glassInput}
                placeholder="Your nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
            </div>
          )}

          {view === "register" && (
            <div style={{ marginBottom: 16 }}>
              <label style={glassLabel}>Email</label>
              <input
                style={glassInput}
                type="email"
                placeholder="name@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          )}

          {view === "register" && (
            <div style={{ marginBottom: 16 }}>
              <label style={glassLabel}>Role</label>
              <select 
                style={{ ...glassInput, appearance: "none" }}
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="athlete">Athlete</option>
                <option value="coach">Coach</option>
              </select>
            </div>
          )}

          <div style={{ marginBottom: view === "login" ? 16 : 0, position: "relative" }}>
            <label style={glassLabel}>Password</label>
            <input
              style={glassInput}
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ position: "absolute", right: 14, top: 38, background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {view === "login" && (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <span style={{ fontSize: 13, color: "var(--aura-accent, #6366f1)", fontWeight: 600, cursor: "pointer" }}>Forgot Password?</span>
            </div>
          )}
        </div>

        {error && (
          <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 16, textAlign: "center", fontWeight: 600 }}>
            {error}
          </div>
        )}

        <button style={accentBtn} type="submit" disabled={loading}>
          {loading ? "Please wait..." : (view === "register" ? "Create Account" : "Sign In")}
        </button>

        {view === "login" && (
          <>
            <div style={{ display: "flex", alignItems: "center", margin: "24px 0", color: "#64748b", fontSize: 12 }}>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
              <span style={{ padding: "0 12px" }}>Or login with</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
            </div>
            
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div style={{ width: "100%", background: "rgba(255,255,255,0.06)", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError("Google Login failed.")}
                  theme="filled_black"
                  shape="pill"
                  width="100%"
                />
              </div>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
