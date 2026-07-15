import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useAuth } from "../../utils/auth";
import { api } from "../../utils/api";
import { useUnits } from "../../utils/units";
import { useTheme } from "../../utils/theme";
import {
  ArrowLeft, Camera, User, Settings, Shield, Bell, ChevronRight,
  TrendingUp, Scale, Star, LogOut, Check, Calendar, Activity, CheckCircle,
  Moon, Sun, Sparkles, Users
} from "lucide-react";
import { useToast } from "../../components/Toast";
import { resolveBackendUrl } from "../../utils/config";
import "../styles/mobile.css";

const LEVELS = ["beginner", "intermediate", "advanced"];

const AVAILABLE_THEMES = [
  { id: 'dark', Icon: Moon, gradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', accent: '#00f2fe' },
  { id: 'light', Icon: Sun, gradient: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)', accent: '#2563eb' },
  { id: 'queen', Icon: Sparkles, gradient: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)', accent: '#ec4899' },
];

export default function MobileProfile() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, logout, updateProfile } = useAuth();
  const { units, formatWeight } = useUnits();
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef(null);

  // Profile fields state
  const [profile, setProfile] = useState({
    name: "", display_name: "", date_of_birth: "",
    age: "", height_cm: "", bodyweight: "",
    sex: "M", experience: "intermediate", goal: "build muscle",
    target_weight: "", target_date: "",
    notif_rest_day: true, notif_streak: true, notif_weekly_summary: true,
    privacy_public: true, privacy_social: true
  });

  const [activeTab, setActiveTab] = useState("overview"); // 'overview' | 'info' | 'settings'
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [weightHistory, setWeightHistory] = useState([]);
  const [logWeight, setLogWeight] = useState("");
  const [logLoading, setLogLoading] = useState(false);
  const [stats, setStats] = useState({});

  // Sync profile state with user record
  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || "",
        display_name: user.display_name || user.name || "",
        date_of_birth: user.date_of_birth || "",
        age: user.age || "",
        height_cm: user.height_cm || "",
        bodyweight: user.bodyweight || "",
        sex: user.sex || "M",
        experience: user.experience || "beginner",
        goal: user.goal || "general",
        target_weight: user.target_weight || "",
        target_date: user.target_date || "",
        notif_rest_day: user.notif_rest_day ?? true,
        notif_streak: user.notif_streak ?? true,
        notif_weekly_summary: user.notif_weekly_summary ?? true,
        privacy_public: user.privacy_public ?? true,
        privacy_social: user.privacy_social ?? true
      });
    }
  }, [user]);

  // Load stats and weight history
  const fetchWeightHistory = useCallback(() => {
    api.getBodyWeightLog(365)
      .then(logs => {
        const transformed = (logs || []).map(log => ({
          date: log.logged_at,
          weight: log.weight_kg,
        }));
        setWeightHistory(transformed);
      })
      .catch(() => setWeightHistory([]));
  }, []);

  useEffect(() => {
    fetchWeightHistory();
    api.getDashboardStats()
      .then(setStats)
      .catch(() => {});
  }, [fetchWeightHistory]);

  const set = (k, v) => setProfile(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        ...profile,
        age: profile.age ? +profile.age : undefined,
        height_cm: profile.height_cm ? +profile.height_cm : undefined,
        bodyweight: profile.bodyweight ? +profile.bodyweight : undefined,
        target_weight: profile.target_weight ? +profile.target_weight : undefined,
      });
      setEditing(false);
      toast.success("Profile details updated! 👍");
      if (profile.bodyweight) fetchWeightHistory();
    } catch (e) {
      toast.error(e.message || "Save failed");
    } finally { setSaving(false); }
  };

  const handleLogWeight = async () => {
    const w = parseFloat(logWeight);
    if (!w || w <= 0) return;
    setLogLoading(true);
    try {
      const converted = units.weight === 'lb' ? w / 2.20462 : w;
      await api.logBodyWeight(converted);
      setLogWeight("");
      toast.success(`Weight logged: ${w}${units.weight} ⚖️`);
      fetchWeightHistory();
    } catch (e) {
      toast.error("Failed to log weight: " + e.message);
    } finally { setLogLoading(false); }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    toast.info("Uploading photo...");
    try {
      const res = await api.uploadAvatar(file);
      await updateProfile({ avatar_url: res.avatar_url });
      toast.success("Avatar updated successfully! 📸");
    } catch (err) {
      toast.error("Failed to upload photo");
    }
  };

  const inputStyle = {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12, padding: "12px 14px",
    color: "var(--text-primary)", fontSize: 14, fontFamily: "inherit",
    outline: "none", width: '100%', marginBottom: 12
  };

  const labelStyle = {
    fontSize: 10, fontWeight: 800, color: "var(--text-secondary)",
    textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, display: 'block'
  };

  // Reusable profile item row
  function MenuRow({ label, icon: Icon, value, onClick, isRed }) {
    return (
      <div
        onClick={onClick}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 4px", borderBottom: "1px solid var(--color-border, rgba(255,255,255,0.04))",
          cursor: onClick ? 'pointer' : 'default', transition: "background 0.15s",
          color: isRed ? '#EF4444' : 'var(--color-text, #fff)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Icon size={16} style={{ color: isRed ? '#EF4444' : 'var(--aura-accent)' }} />
          <span style={{ fontSize: 13, fontWeight: 700 }}>{label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {value && <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{value}</span>}
          {onClick && <ChevronRight size={14} color="var(--text-secondary)" />}
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-page" style={{ paddingBottom: 120, background: "var(--color-bg)", minHeight: "100vh" }}>
      {/* ── Mockup Header Block ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, marginTop: 12 }}>
        <button 
          onClick={() => navigate(-1)}
          style={{
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)",
            color: "var(--text-primary)", cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", width: 38, height: 38, borderRadius: 12
          }}
        >
          <ArrowLeft size={16} />
        </button>
        <h2 style={{ fontSize: 16, fontWeight: 900, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
          Profile
        </h2>
        <div style={{ width: 38 }} /> {/* Spacing placeholder to center title */}
      </div>

      {/* ── Large Profile Center Avatar with Star Gold Badge ── */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "16px 0 24px" }}>
        <div style={{ position: "relative", marginBottom: 16 }}>
          <div
            onClick={handleAvatarClick}
            style={{
              width: 98, height: 98, borderRadius: "50%", overflow: "hidden",
              border: "3px solid var(--aura-accent)", display: "flex",
              alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.05)",
              boxShadow: "0 0 25px rgba(var(--aura-accent-rgb),0.3)", cursor: "pointer"
            }}
          >
            {user?.avatar_url ? (
              <img src={resolveBackendUrl(user.avatar_url)} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--aura-accent)' }}>
                {(profile.display_name || user?.nickname || "U").charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          {/* Avatar camera update button */}
          <div style={{
            position: 'absolute', bottom: 0, right: 0,
            background: 'var(--aura-accent)', color: "var(--text-primary)", padding: 6, borderRadius: '50%',
            boxShadow: '0 4px 10px rgba(0,0,0,0.3)', border: "2px solid #0c0d12"
          }}>
            <Camera size={12} />
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
            accept="image/*"
          />
        </div>

        {/* Display Name and Email */}
        <h2 style={{ fontSize: 20, fontWeight: 900, color: "var(--text-primary)", margin: 0, textTransform: "uppercase", letterSpacing: "-0.5px" }}>
          {profile.display_name || user?.nickname}
        </h2>
        <span style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
          {user?.email || `${user?.nickname || "athlete"}@hpi.local`}
        </span>

        {/* Badges/Streak Row */}
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 900, padding: '5px 12px', background: "rgba(255,255,255,0.05)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-primary)" }}>
            🔥 {stats?.current_streak_days || 0} DAY STREAK
          </div>
          <div style={{ fontSize: 10, fontWeight: 900, padding: '5px 12px', background: 'rgba(var(--aura-accent-rgb),0.08)', borderRadius: 12, border: "1px solid rgba(var(--aura-accent-rgb),0.2)", color: 'var(--aura-accent)' }}>
            🎖️ {profile.experience?.toUpperCase()}
          </div>
        </div>
      </div>

      {/* ── Mockup Horizontal Personal Data Card (3 Columns) ── */}
      <div className="mobile-card" style={{ padding: "16px 20px", marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
          <div style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}>
            <span style={{ fontSize: 16, fontWeight: 900, color: "var(--text-primary)" }}>{profile.height_cm ? `${profile.height_cm}cm` : "—"}</span>
            <div style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase", marginTop: 4 }}>Height</div>
          </div>
          <div style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}>
            <span style={{ fontSize: 16, fontWeight: 900, color: "var(--text-primary)" }}>{profile.bodyweight ? `${formatWeight(profile.bodyweight)}` : "—"}</span>
            <div style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase", marginTop: 4 }}>Weight</div>
          </div>
          <div>
            <span style={{ fontSize: 16, fontWeight: 900, color: "var(--text-primary)" }}>{profile.age ? `${profile.age} Yrs` : "—"}</span>
            <div style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase", marginTop: 4 }}>Age</div>
          </div>
        </div>
      </div>

      {/* ── Sub-tabs navigation ── */}
      <div style={{ display: "flex", gap: 6, background: "rgba(255,255,255,0.05)", padding: 4, borderRadius: 14, marginBottom: 20 }}>
        {["overview", "info", "settings"].map(t => (
          <button
            key={t}
            onClick={() => { setActiveTab(t); setEditing(false); }}
            style={{
              flex: 1, padding: "10px 0", borderRadius: 10, border: "none",
              background: activeTab === t ? "var(--aura-accent)" : "transparent",
              color: activeTab === t ? "#ffffff" : "var(--text-secondary)",
              fontWeight: 800, fontSize: 11, textTransform: "uppercase", transition: "all 0.2s"
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── TAB CONTENT: OVERVIEW (Stats & Weight Recharts Chart) ── */}
      {activeTab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Lifetime statistics */}
          <div className="mobile-card" style={{ padding: "16px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--aura-accent)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
              Lifetime Power Stats
            </div>
            <div className="mobile-grid-2x2">
              <div className="mobile-grid-item">
                <span className="mobile-grid-label">Total Volume</span>
                <span className="mobile-grid-val">
                  {stats.total_volume_kg >= 1000 ? `${(stats.total_volume_kg / 1000).toFixed(1)}t` : `${Math.round(stats.total_volume_kg || 0)}kg`}
                </span>
              </div>
              <div className="mobile-grid-item">
                <span className="mobile-grid-label">Sessions</span>
                <span className="mobile-grid-val">{stats.total_sessions || 0}</span>
              </div>
              <div className="mobile-grid-item">
                <span className="mobile-grid-label">Avg Duration</span>
                <span className="mobile-grid-val">{stats.avg_duration_minutes || 0}m</span>
              </div>
              <div className="mobile-grid-item">
                <span className="mobile-grid-label">Last Session</span>
                <span className="mobile-grid-val">{stats.last_session_days_ago === 0 ? "Today" : `${stats.last_session_days_ago || 0}d ago`}</span>
              </div>
            </div>
          </div>

          {/* Weight journey Recharts */}
          <div className="mobile-card" style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <TrendingUp size={16} color="var(--aura-accent)" />
                <span style={{ fontSize: 11, fontWeight: 800, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Weight Journey</span>
              </div>
              {weightHistory.length > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)" }}>
                  Current: <strong style={{ color: "var(--aura-accent)" }}>{formatWeight(profile.bodyweight)}</strong>
                </span>
              )}
            </div>

            {weightHistory.length >= 2 ? (
              <div style={{ marginBottom: 16, width: "100%", height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weightHistory} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9, fontWeight: 700 }}
                      tickLine={false}
                      axisLine={false}
                      dy={5}
                      tickFormatter={(d) => new Date(d).toLocaleDateString("en", { month: "short", day: "numeric" })}
                    />
                    <YAxis
                      tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9, fontWeight: 700 }}
                      tickLine={false}
                      axisLine={false}
                      unit={` ${units.weight}`}
                      domain={['dataMin - 1', 'dataMax + 1']}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(20, 22, 28, 0.95)',
                        border: "1px solid var(--color-border)",
                        borderRadius: 12,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(8px)',
                        fontSize: 11
                      }}
                      labelStyle={{ color: 'var(--text-secondary)', fontWeight: 700, marginBottom: 2 }}
                      itemStyle={{ color: 'var(--aura-lime)', fontWeight: 800 }}
                      formatter={(v) => [formatWeight(v), 'Weight']}
                    />
                    <defs>
                      <linearGradient id="colorWeightMobile" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--aura-accent)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="var(--aura-accent)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="weight"
                      stroke="var(--aura-accent)"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorWeightMobile)"
                      dot={{ r: 3, fill: "var(--aura-accent)", strokeWidth: 0 }}
                      activeDot={{ r: 5, stroke: "white", strokeWidth: 2, fill: "var(--aura-accent)" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{
                height: 120, display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", color: "var(--text-secondary)", background: "rgba(255,255,255,0.01)",
                borderRadius: 16, border: "1px dashed rgba(255,255,255,0.05)", marginBottom: 16
              }}>
                <Scale size={24} style={{ opacity: 0.2, marginBottom: 8 }} />
                <span style={{ fontSize: 12 }}>Log 2+ entries to unlock weight chart</span>
              </div>
            )}

            {/* Quick Weight Entry Logger */}
            <div style={{
              display: 'flex', background: "rgba(255,255,255,0.05)",
              borderRadius: 14, padding: 3, border: "1px solid rgba(255,255,255,0.1)"
            }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="number"
                  placeholder="Log Weight..."
                  value={logWeight}
                  onChange={e => setLogWeight(e.target.value)}
                  style={{
                    width: '100%', background: 'transparent', border: 'none',
                    padding: '12px 14px', paddingRight: 40, color: "var(--text-primary)",
                    fontSize: 13, fontWeight: 700, outline: 'none'
                  }}
                />
                <span style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  fontSize: 10, fontWeight: 900, color: 'var(--text-secondary)', opacity: 0.6
                }}>
                  {units.weight.toUpperCase()}
                </span>
              </div>
              <button
                onClick={handleLogWeight}
                disabled={logLoading || !logWeight}
                style={{
                  padding: '0 16px', borderRadius: 12,
                  background: logWeight ? 'var(--aura-accent)' : 'rgba(255,255,255,0.03)',
                  color: logWeight ? '#fff' : 'var(--text-secondary)',
                  border: 'none', fontWeight: 800, fontSize: 11, cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {logLoading ? "..." : "LOG"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB CONTENT: INFO (Personal data edit fields) ── */}
      {activeTab === "info" && (
        <div className="mobile-card" style={{ padding: "16px 20px" }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--aura-accent)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Personal Details
            </div>
            <button
              onClick={() => { if (editing) handleSave(); else setEditing(true); }}
              disabled={saving}
              style={{
                background: editing ? "var(--aura-accent)" : "var(--color-surface-h, rgba(255,255,255,0.05))",
                border: "1px solid var(--color-border, rgba(255,255,255,0.1))",
                borderRadius: 10, padding: "6px 12px", color: editing ? "#fff" : "var(--color-text, #fff)",
                fontSize: 11, fontWeight: 800, cursor: "pointer"
              }}
            >
              {editing ? (saving ? "SAVING..." : "SAVE") : "EDIT"}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {editing ? (
              <>
                <div>
                  <label style={labelStyle}>Display Name</label>
                  <input style={inputStyle} value={profile.display_name} onChange={e => set('display_name', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Gender</label>
                  <select style={inputStyle} value={profile.sex} onChange={e => set('sex', e.target.value)}>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="X">Other</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Birth Date</label>
                  <input style={inputStyle} type="date" value={profile.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Height ({units.height})</label>
                  <input style={inputStyle} type="number" value={profile.height_cm} onChange={e => set('height_cm', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Fitness Level</label>
                  <select style={inputStyle} value={profile.experience} onChange={e => set('experience', e.target.value)}>
                    {LEVELS.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
                  </select>
                </div>
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <MenuRow label="Display Name" icon={User} value={profile.display_name} />
                <MenuRow label="Gender" icon={User} value={profile.sex === 'M' ? 'Male' : profile.sex === 'F' ? 'Female' : 'Other'} />
                <MenuRow label="Birth Date" icon={Calendar} value={profile.date_of_birth || "Not logged"} />
                <MenuRow label="Height" icon={Scale} value={`${profile.height_cm} ${units.height}`} />
                <MenuRow label="Fitness Level" icon={Star} value={profile.experience?.toUpperCase()} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB CONTENT: PREFS (Unit preferences, Toggles, Logout) ── */}
      {activeTab === "settings" && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Unit preferences */}
          <div className="mobile-card" style={{ padding: "16px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--aura-accent)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
              Unit Settings
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <MenuRow
                label="Weight System"
                icon={Scale}
                value={units.weight.toUpperCase()}
                onClick={() => {
                  const val = units.weight === 'kg' ? 'lb' : 'kg';
                  updateProfile({ unit_weight: val });
                  toast.success(`Units updated to ${val.toUpperCase()}`);
                }}
              />
              <MenuRow
                label="Height / Measurements"
                icon={Scale}
                value={units.height.toUpperCase()}
                onClick={() => {
                  const val = units.height === 'cm' ? 'inches' : 'cm';
                  updateProfile({ unit_height: val });
                  toast.success(`Units updated to ${val.toUpperCase()}`);
                }}
              />
            </div>
          </div>

          {/* Coach / Athlete Zone */}
          <div className="mobile-card" style={{ padding: "10px 14px" }}>
            <MenuRow
              label="Coach / Athlete Zone"
              icon={Users}
              value={""}
              onClick={() => navigate('/coach')}
            />
          </div>

          {/* Theme Switcher */}
          <div className="mobile-card" style={{ padding: "16px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--aura-accent)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 16 }}>
              Visual Theme
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 24 }}>
              {AVAILABLE_THEMES.map(t => {
                const isActive = theme === t.id;
                const IconComp = t.Icon;
                return (
                  <div 
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                  >
                    <div style={{
                      width: 56, height: 56, borderRadius: '50%',
                      background: t.gradient,
                      display: 'flex', justifyContent: 'center', alignItems: 'center',
                      border: isActive ? `2.5px solid ${t.accent}` : '2.5px solid transparent',
                      boxShadow: isActive ? `0 0 20px ${t.accent}55, 0 0 40px ${t.accent}22` : '0 4px 12px rgba(0,0,0,0.2)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: isActive ? 'scale(1.1)' : 'scale(1)',
                    }}>
                      <IconComp size={22} color={isActive ? '#ffffff' : 'rgba(255,255,255,0.7)'} strokeWidth={isActive ? 2.5 : 2} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notifications Toggles */}
          <div className="mobile-card" style={{ padding: "16px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--aura-accent)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 14 }}>
              Notifications
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { id: 'notif_rest_day', label: 'Rest Day Reminders', desc: 'Alerts on non-training days' },
                { id: 'notif_streak', label: 'Streak Warnings', desc: 'Alerts if you miss 2+ days' },
                { id: 'notif_weekly_summary', label: 'Weekly Summary', desc: 'Progress report every Monday' }
              ].map(n => (
                <div key={n.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{n.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{n.desc}</div>
                  </div>
                  <div
                    onClick={() => {
                      const newVal = !profile[n.id];
                      set(n.id, newVal);
                      updateProfile({ [n.id]: newVal });
                      toast.success(`${n.label} toggled ${newVal ? "ON" : "OFF"}`);
                    }}
                    style={{
                      width: 42, height: 22, borderRadius: 12,
                      background: profile[n.id] ? 'var(--aura-accent)' : 'var(--color-border-h, rgba(255,255,255,0.08))',
                      position: 'relative', cursor: 'pointer', transition: 'all 0.2s',
                      border: "1px solid var(--color-border, rgba(255,255,255,0.06))"
                    }}
                  >
                    <div style={{
                      width: 16, height: 16, borderRadius: '50%',
                      background: '#ffffff',
                      position: 'absolute', top: 2, left: profile[n.id] ? 22 : 2,
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Privacy Toggles */}
          <div className="mobile-card" style={{ padding: "16px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--aura-accent)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 14 }}>
              Privacy Controls
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { id: 'privacy_public', label: 'Visible to Coaches', desc: 'Allow certified coaches to find you' },
                { id: 'privacy_social', label: 'Social Activity Stream', desc: 'Share logs to community feed' }
              ].map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{p.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{p.desc}</div>
                  </div>
                  <div
                    onClick={() => {
                      const newVal = !profile[p.id];
                      set(p.id, newVal);
                      updateProfile({ [p.id]: newVal });
                      toast.success(`${p.label} updated!`);
                    }}
                    style={{
                      width: 42, height: 22, borderRadius: 12,
                      background: profile[p.id] ? 'var(--aura-accent)' : 'var(--color-border-h, rgba(255,255,255,0.08))',
                      position: 'relative', cursor: 'pointer', transition: 'all 0.2s',
                      border: "1px solid var(--color-border, rgba(255,255,255,0.06))"
                    }}
                  >
                    <div style={{
                      width: 16, height: 16, borderRadius: '50%',
                      background: '#ffffff',
                      position: 'absolute', top: 2, left: profile[p.id] ? 22 : 2,
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Red Logout trigger row */}
          <div className="mobile-card" style={{ padding: "10px 14px", border: "1px solid rgba(239, 68, 68, 0.15)", background: "rgba(239, 68, 68, 0.02)" }}>
            <MenuRow
              label="Log Out of Aurafit"
              icon={LogOut}
              isRed
              onClick={() => {
                if (window.confirm("Are you sure you want to sign out?")) {
                  logout();
                  toast.info("Logged out safely. See you soon!");
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
