import React, { useState, useEffect, useCallback, useRef } from "react";
import Header from "../components/layout/Header";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

import { useDashboard } from "../hooks/useAnalytics";
import { fmt } from "../utils/formatters";
import { HpiLogo } from "../utils/icons";
import { useAuth } from "../utils/auth";
import { api } from "../utils/api";
import {
  CheckCircle, TrendingUp, Scale, Camera, User,
  Settings, Shield, Bell, ChevronRight,
  Info, Calendar, Weight, Ruler
} from "lucide-react";
import { useChartColors } from "../hooks/useChartColors";
import { useTheme } from '../utils/theme';
import { useUnits } from '../utils/units';

function Row({ label, value, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0",
        borderBottom: "1.2px solid var(--color-border)",
        cursor: onClick ? 'pointer' : 'default'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 13, color: "var(--color-text-2)" }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text)" }}>{value}</span>
        {onClick && <ChevronRight size={14} color="var(--color-text-3)" />}
      </div>
    </div>
  );
}

const LEVELS = ["beginner", "intermediate", "advanced"];

export default function Profile() {
  const { data, stats } = useDashboard();
  const { user, logout, updateProfile } = useAuth();
  const { units, formatWeight, convertWeight } = useUnits();
  const cc = useChartColors();
  const { theme } = useTheme();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState("overview");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [weightHistory, setWeightHistory] = useState([]);
  const [logWeight, setLogWeight] = useState("");
  const [logLoading, setLogLoading] = useState(false);
  const [logSuccess, setLogSuccess] = useState(false);

  const [profile, setProfile] = useState({
    name: "", display_name: "", date_of_birth: "",
    age: "", height_cm: "", bodyweight: "",
    sex: "M", experience: "intermediate", goal: "build muscle",
    target_weight: "", target_date: "",
    notif_rest_day: true, notif_streak: true, notif_weekly_summary: true,
    privacy_public: true, privacy_social: true
  });

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

  useEffect(() => { fetchWeightHistory(); }, [fetchWeightHistory]);

  const set = (k, v) => setProfile(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true); setError(null);
    try {
      await updateProfile({
        ...profile,
        age: profile.age ? +profile.age : undefined,
        height_cm: profile.height_cm ? +profile.height_cm : undefined,
        bodyweight: profile.bodyweight ? +profile.bodyweight : undefined,
        target_weight: profile.target_weight ? +profile.target_weight : undefined,
      });
      setEditing(false);
      if (profile.bodyweight) fetchWeightHistory();
    } catch (e) {
      setError(e.message || "Save failed");
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
      setLogSuccess(true);
      setTimeout(() => setLogSuccess(false), 2500);
      fetchWeightHistory();
    } catch (e) {
      setError(e.message);
    } finally { setLogLoading(false); }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSaving(true);
    try {
      const res = await api.uploadAvatar(file);
      await updateProfile({ avatar_url: res.avatar_url });
    } catch (err) {
      setError("Failed to upload photo");
    } finally {
      setSaving(false);
    }
  };


  const glassCard = {
    background: "var(--bg-glass)",

    border: "1px solid var(--border-card)",
    borderRadius: 16,
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    padding: 20,
  };

  const inputStyle = {
    background: "var(--bg-input)",
    border: "1px solid var(--border-input)",
    borderRadius: 10, padding: "10px 14px",
    color: "var(--color-text)", fontSize: 14, fontFamily: "inherit",
    outline: "none", transition: "border-color 0.15s",
    width: '100%'
  };

  const TabButton = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        padding: '12px 8px', borderRadius: 12, border: 'none',
        background: activeTab === id ? 'var(--aura-accent)' : 'transparent',
        color: activeTab === id ? 'var(--color-on-accent)' : 'var(--color-text-2)',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer'
      }}
    >
      <Icon size={18} strokeWidth={activeTab === id ? 2.5 : 2} />
      <span style={{ fontSize: 11, fontWeight: 700 }}>{label}</span>
    </button>
  );

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 100, background: 'var(--color-bg)' }}>
      <Header title="Profile" subtitle="Command Center Settings" />

      <div className="page-inner" style={{ maxWidth: 800, margin: '0 auto', display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Top Header / Identity */}
        <div className="glass p-6" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative' }}>
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <div
              onClick={handleAvatarClick}
              style={{
                width: 100, height: 100, borderRadius: 32, overflow: 'hidden',
                background: 'var(--bg-card)', border: '2px solid var(--aura-accent)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--aura-accent)' }}>
                  {user?.nickname?.charAt(0).toUpperCase()}
                </div>
              )}
              <div style={{
                position: 'absolute', bottom: -4, right: -4,
                background: 'var(--aura-accent)', color: 'white', padding: 6, borderRadius: '50%',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
              }}>
                <Camera size={14} />
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: 'none' }}
              accept="image/*"
            />
          </div>

          <div style={{ fontWeight: 800, fontSize: 24, color: "var(--color-text)" }}>
            {profile.display_name || user?.nickname}
          </div>
          <div style={{ fontSize: 14, color: "var(--color-text-3)", marginTop: 4 }}>
            {user?.email || `${user?.nickname}@hpi.local`}
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <div className="glass-pill" style={{ fontSize: 12, fontWeight: 700, padding: '6px 12px', background: 'var(--bg-glass)' }}>
              {stats?.current_streak || 0} DAY STREAK
            </div>
            <div className="glass-pill" style={{ fontSize: 12, fontWeight: 700, padding: '6px 12px', background: 'var(--bg-glass)', color: 'var(--aura-accent)' }}>
              {profile.experience?.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: 8, background: 'var(--bg-card)', padding: 6, borderRadius: 18, border: '1px solid var(--border-card)' }}>
          <TabButton id="overview" label="OVERVIEW" icon={TrendingUp} />
          <TabButton id="info" label="INFO" icon={User} />
          <TabButton id="settings" label="PREFS" icon={Settings} />
        </div>

        {/* Tab Content: Overview */}
        {activeTab === "overview" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="glass p-5">
              <div className="section-label">LIFETIME STATS</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
                <div style={{ padding: 16, borderRadius: 12, background: 'var(--bg-glass)' }}>
                  <div style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 700, marginBottom: 4 }}>TOTAL VOLUME</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--aura-accent)' }}>{fmt.tonnes(data?.total_volume_tonnes || 0)}</div>
                </div>
                <div style={{ padding: 16, borderRadius: 12, background: 'var(--bg-glass)' }}>
                  <div style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 700, marginBottom: 4 }}>TOTAL SETS</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--aura-accent2)' }}>{fmt.int(stats?.total_sets || 0)}</div>
                </div>
              </div>
              <Row label="Total Workouts" value={fmt.int(stats?.total_workouts || 0)} />
              <Row label="Avg Session" value={`${stats?.avg_session_duration_min || 0} min`} />
              <Row label="Favourite Exercise" value={stats?.favourite_exercise || "—"} />
            </div>

            <div style={glassCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <TrendingUp size={18} style={{ color: "var(--aura-accent)" }} />
                  <div className="section-label" style={{ margin: 0, letterSpacing: '0.05em' }}>WEIGHT JOURNEY</div>
                </div>
                {weightHistory.length > 0 && (
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-3)' }}>
                    CURRENT: <span style={{ color: 'var(--color-text)' }}>{formatWeight(profile.bodyweight)}</span>
                  </div>
                )}
              </div>

              {weightHistory.length >= 2 ? (
                <div style={{ marginBottom: 24, padding: '10px 0' }}>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={weightHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke={cc.border} vertical={false} opacity={0.3} />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: cc.tick, fontSize: 10, fontWeight: 600 }}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                        tickFormatter={(d) => new Date(d).toLocaleDateString("en", { month: "short", day: "numeric" })}
                      />
                      <YAxis
                        tick={{ fill: cc.tick, fontSize: 10, fontWeight: 600 }}
                        tickLine={false}
                        axisLine={false}
                        unit={` ${units.weight}`}
                        domain={['dataMin - 2', 'dataMax + 2']}
                        dx={-10}
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'rgba(20, 20, 20, 0.9)',
                          border: '1px solid var(--border-card)',
                          borderRadius: 12,
                          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                          backdropFilter: 'blur(8px)'
                        }}
                        labelStyle={{ color: 'var(--color-text-3)', fontSize: 11, marginBottom: 4, fontWeight: 700 }}
                        itemStyle={{ color: 'var(--aura-accent)', fontWeight: 800 }}
                        formatter={(v) => [formatWeight(v), 'Weight']}
                      />
                      <defs>
                        <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--aura-accent)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="var(--aura-accent)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="weight"
                        stroke="var(--aura-accent)"
                        strokeWidth={4}
                        fillOpacity={1}
                        fill="url(#colorWeight)"
                        dot={{ r: 4, fill: "var(--aura-accent)", strokeWidth: 0 }}
                        activeDot={{ r: 6, stroke: "white", strokeWidth: 2, fill: "var(--aura-accent)" }}
                        animationDuration={1500}
                      />
                    </AreaChart>
                  </ResponsiveContainer>

                </div>
              ) : (
                <div style={{ height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)', background: 'rgba(255,255,255,0.02)', borderRadius: 16, marginBottom: 20, border: '1px dashed var(--border-card)' }}>
                  <Scale size={32} style={{ opacity: 0.2, marginBottom: 12 }} />
                  <span style={{ fontSize: 13, fontWeight: 500 }}>Log 2+ entries to visualize your progress</span>
                </div>
              )}

              <div style={{
                display: 'flex',
                background: 'var(--bg-glass)',
                borderRadius: 16,
                padding: 4,
                border: '1px solid var(--border-card)',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type="number"
                    placeholder="00.0"
                    value={logWeight}
                    onChange={e => setLogWeight(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      padding: '14px 18px',
                      paddingRight: 50,
                      color: 'var(--color-text)',
                      fontSize: 16,
                      fontWeight: 800,
                      outline: 'none',
                    }}
                  />
                  <span style={{
                    position: 'absolute',
                    right: 18,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: 12,
                    fontWeight: 900,
                    color: 'var(--color-text-3)',
                    opacity: 0.5
                  }}>
                    {units.weight.toUpperCase()}
                  </span>
                </div>
                <button
                  onClick={handleLogWeight}
                  disabled={logLoading || !logWeight}
                  style={{
                    padding: '0 24px',
                    borderRadius: 12,
                    background: logWeight ? 'var(--aura-accent)' : 'rgba(255,255,255,0.05)',
                    color: logWeight ? 'white' : 'var(--color-text-3)',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: 12,
                    letterSpacing: '0.05em',
                    cursor: logWeight ? 'pointer' : 'default',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  {logLoading ? "..." : "LOG WEIGHT"}
                </button>
              </div>
            </div>

          </div>
        )}

        {/* Tab Content: Personal Info */}
        {activeTab === "info" && (
          <div className="glass p-6">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div className="section-label" style={{ margin: 0 }}>PERSONAL DETAILS</div>
              <button className="btn-ghost" onClick={() => setEditing(!editing)}>
                {editing ? 'CANCEL' : 'EDIT'}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {editing ? (
                <>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', marginBottom: 8, display: 'block' }}>DISPLAY NAME</label>
                    <input style={inputStyle} value={profile.display_name} onChange={e => set('display_name', e.target.value)} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', marginBottom: 8, display: 'block' }}>GENDER</label>
                      <select style={inputStyle} value={profile.sex} onChange={e => set('sex', e.target.value)}>
                        <option value="M">Male</option>
                        <option value="F">Female</option>
                        <option value="X">Other</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', marginBottom: 8, display: 'block' }}>BIRTH DATE</label>
                      <input style={inputStyle} type="date" value={profile.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', marginBottom: 8, display: 'block' }}>HEIGHT ({units.height})</label>
                      <input style={inputStyle} type="number" value={profile.height_cm} onChange={e => set('height_cm', e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', marginBottom: 8, display: 'block' }}>EXPERIENCE</label>
                      <select style={inputStyle} value={profile.experience} onChange={e => set('experience', e.target.value)}>
                        {LEVELS.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
                      </select>
                    </div>
                  </div>
                  <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ marginTop: 8 }}>
                    {saving ? "SAVING..." : "SAVE CHANGES"}
                  </button>
                </>
              ) : (
                <>
                  <Row label="Display Name" value={profile.display_name} />
                  <Row label="Gender" value={profile.sex === 'M' ? 'Male' : profile.sex === 'F' ? 'Female' : 'Other'} />
                  <Row label="Birth Date" value={fmt.date(profile.date_of_birth)} />
                  <Row label="Height" value={`${profile.height_cm} ${units.height}`} />
                  <Row label="Fitness Level" value={profile.experience?.toUpperCase()} />
                </>
              )}
            </div>
          </div>
        )}


        {/* Tab Content: Preferences */}
        {activeTab === "settings" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="glass p-6">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Settings size={18} color="var(--aura-accent)" />
                <div className="section-label" style={{ margin: 0 }}>UNIT PREFERENCES</div>
              </div>
              <Row label="Weight System" value={units.weight.toUpperCase()} onClick={() => updateProfile({ unit_weight: units.weight === 'kg' ? 'lb' : 'kg' })} />
              <Row label="Height / Measurements" value={units.height.toUpperCase()} onClick={() => updateProfile({ unit_height: units.height === 'cm' ? 'inches' : 'cm' })} />
            </div>

            <div className="glass p-6">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Bell size={18} color="var(--aura-accent2)" />
                <div className="section-label" style={{ margin: 0 }}>NOTIFICATIONS</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { id: 'notif_rest_day', label: 'Rest Day Reminders', desc: 'Alerts on non-training days' },
                  { id: 'notif_streak', label: 'Streak Warnings', desc: 'Alerts if you miss 2+ days' },
                  { id: 'notif_weekly_summary', label: 'Weekly Summary', desc: 'Progress report every Monday' }
                ].map(n => (
                  <div key={n.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{n.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{n.desc}</div>
                    </div>
                    <div
                      onClick={() => {
                        const newVal = !profile[n.id];
                        set(n.id, newVal);
                        updateProfile({ [n.id]: newVal });
                      }}
                      style={{
                        width: 44, height: 24, borderRadius: 12,
                        background: profile[n.id] ? 'var(--aura-accent)' : 'var(--bg-glass)',
                        position: 'relative', cursor: 'pointer', transition: 'all 0.2s'
                      }}
                    >
                      <div style={{
                        width: 18, height: 18, borderRadius: '50%', background: 'white',
                        position: 'absolute', top: 3, left: profile[n.id] ? 23 : 3,
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass p-6">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Shield size={18} color="var(--aura-accent3)" />
                <div className="section-label" style={{ margin: 0 }}>PRIVACY</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { id: 'privacy_public', label: 'Visible to Coaches', desc: 'Allow coaches to find your profile' },
                  { id: 'privacy_social', label: 'Social Feed', desc: 'Show workouts in activity stream' }
                ].map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{p.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{p.desc}</div>
                    </div>
                    <div
                      onClick={() => {
                        const newVal = !profile[p.id];
                        set(p.id, newVal);
                        updateProfile({ [p.id]: newVal });
                      }}
                      style={{
                        width: 44, height: 24, borderRadius: 12,
                        background: profile[p.id] ? 'var(--aura-accent)' : 'var(--bg-glass)',
                        position: 'relative', cursor: 'pointer', transition: 'all 0.2s'
                      }}
                    >
                      <div style={{
                        width: 18, height: 18, borderRadius: '50%', background: 'white',
                        position: 'absolute', top: 3, left: profile[p.id] ? 23 : 3,
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              className="glass p-5"
              onClick={logout}
              style={{ width: '100%', textAlign: 'center', color: 'var(--aura-accent3)', fontWeight: 800, cursor: 'pointer', border: '1px solid color-mix(in srgb, var(--aura-accent3) 30%, transparent)' }}
            >
              SIGN OUT OF HPI
            </button>
          </div>
        )}

        {error && (
          <div className="glass p-4" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', textAlign: 'center' }}>
            {error}
          </div>
        )}

      </div>
    </div>
  );
}
