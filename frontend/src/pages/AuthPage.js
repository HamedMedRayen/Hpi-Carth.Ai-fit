import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../utils/auth";
import { HpiLogo } from "../utils/icons";
import {
  Mail, ShieldCheck, User, Lock, ArrowRight, Dumbbell, Users,
} from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import OrbThemeSwitcher from "../components/OrbThemeSwitcher";
import GrowthBackground from "../components/GrowthBackground";

export default function AuthPage() {
  const navigate = useNavigate();
  const { login, register, loginGoogle, requestOtp, verifyOtp } = useAuth();
  const [mode,    setMode]    = useState("login");
  const [useOtp,  setUseOtp]  = useState(false);
  const [nickname, setNickname] = useState("");
  const [email,   setEmail]   = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [otp,     setOtp]     = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [error,   setError]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [role,    setRole]    = useState("athlete");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 120);
    return () => clearTimeout(t);
  }, []);

  const switchMode = (next) => {
    setMode(next); setError(null); setOtpSent(false); setUseOtp(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (useOtp) {
        if (!otpSent) {
          if (!email.trim()) throw new Error("Email is required.");
          await requestOtp(email);
          setOtpSent(true);
        } else {
          if (!otp.trim()) throw new Error("Enter the verification code.");
          await verifyOtp(email, otp, navigate);
        }
      } else {
        if (mode === "login") {
          if (!nickname.trim() || !password) throw new Error("Nickname and password required.");
          await login(nickname, password, navigate);
        } else {
          if (!nickname.trim() || !password || !email.trim()) throw new Error("All fields are required.");
          if (password !== confirm) throw new Error("Passwords do not match.");
          await register(nickname, password, email, role, navigate);
        }
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

  const submitLabel = useOtp
    ? (otpSent ? "Verify Code" : "Send Code")
    : (mode === "login" ? "Sign In" : "Create Account");

  return (
    <div className="orion-root">
      {/* ── Animated background ───────────────────────── */}
      <GrowthBackground />

      {/* ── Theme switcher — fixed top-right ─────────── */}
      <div className="orion-theme-btn">
        <OrbThemeSwitcher />
      </div>

      {/* ── Centered stage ────────────────────────────── */}
      <div className="orion-stage">
        <div className={`orion-card${mounted ? " orion-card-in" : ""}`}>

          {/* Logo */}
          <div className="orion-logo-row">
            <div className="orion-logo-icon" style={{ padding: "8px 20px" }}>
              <HpiLogo size={42} forceWhite={true} />
            </div>
          </div>

          {/* Headline */}
          <div className="orion-heading">
            <h1 className="orion-title">
              {mode === "login" ? "Welcome back." : "Create account."}
            </h1>
            <p className="orion-subtitle">
              {mode === "login"
                ? "Sign in to continue your journey."
                : "Join HPI and unlock precision training."}
            </p>
          </div>

          {/* Mode tabs */}
          <div className="orion-tabs" role="tablist">
            <button
              id="orion-tab-signin"
              role="tab"
              aria-selected={mode === "login"}
              className={`orion-tab${mode === "login" ? " active" : ""}`}
              onClick={() => switchMode("login")}
            >
              Sign In
            </button>
            <button
              id="orion-tab-register"
              role="tab"
              aria-selected={mode === "register"}
              className={`orion-tab${mode === "register" ? " active" : ""}`}
              onClick={() => switchMode("register")}
            >
              Register
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="orion-form" noValidate>

            {/* Role picker — register only */}
            {mode === "register" && !useOtp && (
              <div className="orion-field">
                <label className="orion-label">I am a</label>
                <div className="orion-role-row">
                  {[
                    { value: "athlete", label: "Athlete", icon: Dumbbell, desc: "Track my performance" },
                    { value: "coach",   label: "Coach",   icon: Users,    desc: "Manage my athletes" },
                  ].map(r => (
                    <button
                      key={r.value}
                      type="button"
                      id={`orion-role-${r.value}`}
                      onClick={() => setRole(r.value)}
                      className={`orion-role-card${role === r.value ? " active" : ""}`}
                    >
                      <div className={`orion-role-icon${role === r.value ? " active" : ""}`}>
                        <r.icon size={17} />
                      </div>
                      <span className="orion-role-name">{r.label}</span>
                      <span className="orion-role-desc">{r.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Auth method toggle */}
            <div className="orion-method-row">
              <button
                type="button"
                id="orion-method-password"
                className={`orion-method-btn${!useOtp ? " active" : ""}`}
                onClick={() => { setUseOtp(false); setOtpSent(false); }}
              >Password</button>
              <button
                type="button"
                id="orion-method-emailcode"
                className={`orion-method-btn${useOtp ? " active" : ""}`}
                onClick={() => setUseOtp(true)}
              >Email Code</button>
            </div>

            {/* Inputs */}
            <div className="orion-fields">
              {!useOtp && (
                <div className="orion-field">
                  <label className="orion-label" htmlFor="orion-nick">Nickname</label>
                  <div className="orion-input-wrap">
                    <User size={15} className="orion-input-icon" />
                    <input
                      id="orion-nick"
                      className="orion-input"
                      placeholder="e.g. ironathlete"
                      value={nickname}
                      onChange={e => setNickname(e.target.value)}
                      autoComplete="username"
                    />
                  </div>
                </div>
              )}

              {(mode === "register" || useOtp) && (
                <div className="orion-field">
                  <label className="orion-label" htmlFor="orion-email">Email</label>
                  <div className="orion-input-wrap">
                    <Mail size={15} className="orion-input-icon" />
                    <input
                      id="orion-email"
                      className="orion-input"
                      type="email"
                      placeholder="name@domain.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      disabled={otpSent}
                      autoComplete="email"
                    />
                  </div>
                </div>
              )}

              {!useOtp && (
                <div className="orion-field">
                  <label className="orion-label" htmlFor="orion-pw">Password</label>
                  <div className="orion-input-wrap">
                    <Lock size={15} className="orion-input-icon" />
                    <input
                      id="orion-pw"
                      className="orion-input"
                      type="password"
                      placeholder="min. 8 characters"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                    />
                  </div>
                </div>
              )}

              {mode === "register" && !useOtp && (
                <div className="orion-field">
                  <label className="orion-label" htmlFor="orion-confirm">Confirm password</label>
                  <div className="orion-input-wrap">
                    <ShieldCheck size={15} className="orion-input-icon" />
                    <input
                      id="orion-confirm"
                      className="orion-input"
                      type="password"
                      placeholder="repeat your password"
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              )}

              {useOtp && otpSent && (
                <div className="orion-field">
                  <label className="orion-label" htmlFor="orion-otp">Verification code</label>
                  <input
                    id="orion-otp"
                    className="orion-input orion-otp-input"
                    placeholder="· · · · · ·"
                    value={otp}
                    onChange={e => setOtp(e.target.value)}
                    maxLength={6}
                    autoComplete="one-time-code"
                  />
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="orion-error" role="alert">
                <span className="orion-error-icon">!</span>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              id="orion-submit"
              className="orion-submit"
              type="submit"
              disabled={loading}
            >
              {loading
                ? <span className="orion-spinner" />
                : <><span>{submitLabel}</span><ArrowRight size={16} /></>
              }
            </button>
          </form>

          {/* Divider */}
          <div className="orion-divider">
            <span className="orion-divider-line" />
            <span className="orion-divider-text">or</span>
            <span className="orion-divider-line" />
          </div>

          {/* Google */}
          <div className="orion-google">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError("Google Login failed.")}
              theme="filled_black"
              shape="pill"
              width="100%"
            />
          </div>

          {/* Switch mode */}
          <p className="orion-switch">
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button
              id="orion-switch-btn"
              className="orion-switch-link"
              onClick={() => switchMode(mode === "login" ? "register" : "login")}
            >
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>

      {/* Footer */}
      <p className="orion-footer">© 2026 HPI — Hyper Performance Indicator</p>
    </div>
  );
}
