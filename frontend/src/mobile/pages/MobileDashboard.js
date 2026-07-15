import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../utils/auth";
import { api } from "../../utils/api";
import { resolveBackendUrl } from "../../utils/config";
import {
  Bell, Search, MapPin, Dumbbell, Activity, Calendar,
  Brain, Zap, ChevronRight, TrendingUp, Circle, Plus,
  CheckCircle, Trash2, AlertCircle
} from "lucide-react";
import "../styles/mobile.css";
import MobileBottomSheet from "../components/MobileBottomSheet";

export default function MobileDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({});
  const [dashboardData, setDashboardData] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    api.getDashboardStats().then(setStats).catch(() => {});
    api.getDashboardAnalytics(user?.id).then(setDashboardData).catch(() => {});
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [user?.id]);

  const handleMarkRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteNotification(id);
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddWorkout = async (notification) => {
    try {
      const programName = notification.data.program_name || "Suggested Program";
      const workouts = notification.data.workouts || [];
      
      for (const w of workouts) {
        const templateData = {
          name: `${programName} - ${w.name}`,
          exercises: w.exercises
        };
        await api.saveTemplate(templateData);
      }
      
      await api.markNotificationRead(notification.id);
      fetchNotifications();
      navigate('/workouts');
    } catch (e) {
      console.error("Failed to save templates", e);
    }
  };

  const totalVolume = stats.total_volume_kg || 0;
  const sessions = stats.total_sessions || 0;
  const streak = stats.current_streak_days || 0;
  const avgDuration = stats.avg_duration_minutes || 0;
  
  const greetingName = (user?.nickname || user?.display_name || user?.name || "Athlete");

  // Format volume
  const volumeLabel = totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}k` : `${Math.round(totalVolume)}`;

  return (
    <div className="mobile-page" style={{ paddingBottom: 120, background: "var(--color-bg)", minHeight: "100vh" }}>
      
      {/* ── 1. Header Row (Avatar, Greeting, Bell) ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div 
            onClick={() => navigate("/you")}
            style={{
              width: 48, height: 48, borderRadius: "50%", overflow: 'hidden',
              cursor: 'pointer', background: 'rgba(255,255,255,0.1)'
            }}
          >
            {user?.avatar_url ? (
              <img src={resolveBackendUrl(user.avatar_url)} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, color: 'var(--text-primary)' }}>
                {greetingName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>
              Hello, {greetingName}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
              <Zap size={12} color="var(--aura-cyan)" /> Progress: {streak > 0 ? `${streak} Day Streak` : "Getting Started"}
            </div>
          </div>
        </div>
        
        <button 
          onClick={() => { setShowNotifications(true); fetchNotifications(); }}
          style={{
            width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center",
            justifyContent: "center", color: "var(--text-primary)", position: "relative",
            cursor: "pointer"
          }}
        >
          <Bell size={20} />
          {unreadCount > 0 ? (
            <div style={{
              position: "absolute", top: -4, right: -4, background: "#EF4444", 
              color: "white", fontSize: 10, fontWeight: 800, width: 18, height: 18, 
              borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 0 2px var(--color-bg)",
              animation: "pulse 2s infinite"
            }}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </div>
          ) : dashboardData?.active_injuries_count > 0 ? (
            <div style={{ position: "absolute", top: 10, right: 12, width: 8, height: 8, borderRadius: "50%", background: "var(--aura-pink)" }}></div>
          ) : null}
        </button>
      </div>

      {/* ── 2. Large Typography Hero ── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-1px", margin: 0, lineHeight: 1.1 }}>
          Preparing<br/>
          <span style={{ color: "var(--text-secondary)", fontStyle: "italic", fontWeight: 600 }}>for the big move.</span>
        </h1>
      </div>

      {/* ── 3. Pill-shaped Action / Search Bar ── */}
      <div style={{ display: "flex", gap: 12, marginBottom: 32 }}>
        <div style={{
          flex: 1, background: "rgba(255,255,255,0.05)", borderRadius: 30, padding: "0 20px",
          display: "flex", alignItems: "center", gap: 12, border: "1px solid rgba(255,255,255,0.1)"
        }}>
          <Search size={20} color="var(--text-secondary)" />
          <input 
            placeholder="Search exercises..." 
            style={{ background: "transparent", border: "none", color: "var(--text-primary)", fontSize: 16, width: "100%", height: 56, outline: "none" }}
          />
        </div>
        <button 
          onClick={() => navigate("/workouts")}
          style={{
            width: 56, height: 56, borderRadius: "50%", background: "#ffffff", color: "#000000",
            border: "none", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            boxShadow: "0 4px 15px rgba(255,255,255,0.2)"
          }}
        >
          <Plus size={24} strokeWidth={3} />
        </button>
      </div>

      {/* ── 4. Goal Crusher (Horizontal Scroll with 2x2 Cards) ── */}
      <div className="mobile-section-header">
        <h2 className="mobile-section-title">Goal Crusher</h2>
        <button className="mobile-section-link" onClick={() => navigate("/workouts")}>View all</button>
      </div>
      
      <div className="mobile-horizontal-scroll" style={{ marginBottom: 32 }}>
        {/* Card 1: 2x2 Grid */}
        <div className="mobile-card" style={{ flex: "0 0 75%" }}>
          <div className="mobile-grid-2x2">
            <div className="mobile-grid-item">
              <span className="mobile-grid-label">This Week</span>
              <span className="mobile-grid-val">{volumeLabel} kg</span>
            </div>
            <div className="mobile-grid-item">
              <span className="mobile-grid-label">Streak</span>
              <span className="mobile-grid-val">{streak} Days</span>
            </div>
            <div className="mobile-grid-item">
              <span className="mobile-grid-label">Sessions</span>
              <span className="mobile-grid-val">{sessions}</span>
            </div>
            <div className="mobile-grid-item">
              <span className="mobile-grid-label">Avg Time</span>
              <span className="mobile-grid-val">{avgDuration}m</span>
            </div>
          </div>
        </div>

        {/* Card 2: Map/Progress */}
        <div className="mobile-card" style={{ flex: "0 0 75%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>Active Challenge</div>
            <div style={{ fontSize: 18, color: "var(--text-primary)", fontWeight: 800, marginTop: 4 }}>Summer Shred</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 3 }}>
              <div style={{ width: "45%", height: "100%", background: "var(--aura-cyan)", borderRadius: 3 }}></div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--aura-cyan)" }}>45%</span>
          </div>
        </div>
      </div>

      {/* ── 5. AI Insight (If present) ── */}
      {dashboardData?.ai_insight && (
        <div className="mobile-card" style={{ padding: "16px 20px", display: "flex", alignItems: "flex-start", gap: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(99, 102, 241, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--aura-accent)", flexShrink: 0 }}>
            <Brain size={20} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>HPI Insight</div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.4 }}>{dashboardData.ai_insight}</div>
          </div>
        </div>
      )}

      {/* ── 6. Recent Activities (Structured List) ── */}
      <div className="mobile-section-header">
        <h2 className="mobile-section-title">Recent Activities</h2>
        <button className="mobile-section-link" onClick={() => navigate("/workouts")}>View all</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div className="mobile-list-item" onClick={() => navigate("/workouts")}>
          <div className="mobile-list-icon">
            <Dumbbell size={20} color="var(--aura-accent)" />
          </div>
          <div className="mobile-list-content">
            <div className="mobile-list-title">Upper Body Power</div>
            <div className="mobile-list-subtitle">Today</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="mobile-list-value">4,250kg</div>
            <div className="mobile-list-subtitle">45:32</div>
          </div>
        </div>

        <div className="mobile-list-item" onClick={() => navigate("/nutrition")}>
          <div className="mobile-list-icon">
            <Activity size={20} color="var(--aura-orange)" />
          </div>
          <div className="mobile-list-content">
            <div className="mobile-list-title">Post-Workout Meal</div>
            <div className="mobile-list-subtitle">Yesterday</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="mobile-list-value">650 kcal</div>
            <div className="mobile-list-subtitle">42g Protein</div>
          </div>
        </div>
      </div>
      
      {/* ── Notifications Bottom Sheet ── */}
      <MobileBottomSheet 
        isOpen={showNotifications} 
        onClose={() => setShowNotifications(false)} 
        title="Notifications"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingBottom: 24 }}>
          {notifications.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--color-text-3)", fontSize: 14 }}>
              No notifications yet. You're all caught up!
            </div>
          ) : (
            notifications.map(n => (
              <div 
                key={n.id}
                style={{
                  background: n.is_read ? "rgba(255,255,255,0.02)" : "rgba(var(--aura-accent-rgb), 0.05)",
                  border: `1px solid ${n.is_read ? "var(--color-border)" : "rgba(var(--aura-accent-rgb), 0.2)"}`,
                  borderRadius: 16,
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  position: "relative",
                  transition: "all 0.2s"
                }}
              >
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: n.type === 'workout_suggestion' ? 'rgba(var(--aura-accent-rgb), 0.15)' : 'rgba(255,255,255,0.05)',
                    color: n.type === 'workout_suggestion' ? 'var(--aura-accent)' : 'var(--color-text-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {n.type === 'workout_suggestion' ? <Dumbbell size={18} /> : <AlertCircle size={18} />}
                  </div>
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <div style={{ fontSize: 14, fontWeight: n.is_read ? 600 : 800, color: "var(--color-text)", lineHeight: 1.2 }}>
                        {n.title}
                      </div>
                      <span style={{ fontSize: 10, color: "var(--color-text-3)", whiteSpace: "nowrap" }}>
                        {new Date(n.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--color-text-2)", marginTop: 4, lineHeight: 1.4 }}>
                      {n.message}
                    </div>
                  </div>
                </div>

                {n.type === 'workout_suggestion' && n.data?.program_note && (
                  <div style={{
                    background: "rgba(245, 158, 11, 0.08)", color: "#F59E0B", padding: "8px 12px",
                    borderRadius: 10, fontSize: 11, fontStyle: "italic",
                    borderLeft: "3px solid #F59E0B", margin: "0 4px"
                  }}>
                    "{n.data.program_note}"
                  </div>
                )}

                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center",
                  borderTop: "1px solid rgba(255,255,255,0.05)",
                  paddingTop: 12,
                  marginTop: 4
                }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    {n.type === 'workout_suggestion' && n.data && (
                      <button 
                        onClick={() => handleAddWorkout(n)}
                        style={{
                          background: "var(--aura-accent)", color: "#000", border: "none",
                          padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                          display: "flex", alignItems: "center", gap: 4, cursor: "pointer"
                        }}
                      >
                        <Plus size={12} strokeWidth={3} /> Save Template
                      </button>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 12 }}>
                    {!n.is_read && (
                      <button 
                        onClick={() => handleMarkRead(n.id)}
                        style={{ 
                          background: "rgba(255,255,255,0.05)", border: "none", 
                          color: "var(--aura-accent)", cursor: "pointer", 
                          padding: "6px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                          display: "flex", alignItems: "center", gap: 4
                        }}
                      >
                        <CheckCircle size={14} /> Mark Read
                      </button>
                    )}
                    <button 
                      onClick={() => handleDelete(n.id)}
                      style={{ 
                        background: "none", border: "none", 
                        color: "var(--color-text-3)", cursor: "pointer", 
                        padding: 6, display: "flex", alignItems: "center", justifyContent: "center"
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </MobileBottomSheet>

    </div>
  );
}
