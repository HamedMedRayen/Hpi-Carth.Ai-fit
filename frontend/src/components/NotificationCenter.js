import React, { useState, useEffect } from "react";
import { api } from "../utils/api";
import { Bell, CheckCircle, X, Dumbbell, AlertCircle, Plus, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

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
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const handleToggle = () => {
    setOpen(!open);
    if (!open) {
      fetchNotifications();
    }
  };

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

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={handleToggle}
        style={{
          background: "none", border: "none", position: "relative", cursor: "pointer",
          padding: 8, display: "flex", alignItems: "center", justifyContent: "center",
          color: open ? "var(--aura-accent)" : "var(--color-text)",
          transition: "all 0.2s"
        }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <div style={{
            position: "absolute", top: 4, right: 4, background: "#EF4444",
            color: "white", fontSize: 10, fontWeight: 800, width: 16, height: 16,
            borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 0 2px var(--color-bg)"
          }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </div>
        )}
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 90 }}
          />
          <div style={{
            position: "absolute", top: "100%", right: 0, marginTop: 8,
            width: 320, background: "var(--bg-glass)", backdropFilter: "blur(12px)",
            border: "1px solid var(--border-card)", borderRadius: 16,
            boxShadow: "var(--shadow-card)", zIndex: 100, overflow: "hidden",
            display: "flex", flexDirection: "column", maxHeight: 400
          }}>
            <div style={{
              padding: "16px", borderBottom: "1px solid var(--border-card)",
              display: "flex", justifyContent: "space-between", alignItems: "center"
            }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Notifications</h3>
              <button
                onClick={() => setOpen(false)}
                style={{ background: "none", border: "none", color: "var(--color-text-3)", cursor: "pointer" }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ overflowY: "auto", flex: 1, padding: "8px 0" }}>
              {notifications.length === 0 ? (
                <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--color-text-3)", fontSize: 13 }}>
                  No new notifications
                </div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    style={{
                      padding: "12px 16px",
                      borderBottom: "1px solid var(--border-card)",
                      background: n.is_read ? "transparent" : "rgba(var(--aura-accent-rgb), 0.05)",
                      display: "flex", gap: 12, alignItems: "flex-start",
                      transition: "background 0.2s"
                    }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: n.type === 'workout_suggestion' ? 'rgba(var(--aura-accent-rgb), 0.1)' : 'rgba(255,255,255,0.05)',
                      color: n.type === 'workout_suggestion' ? 'var(--aura-accent)' : 'var(--color-text-2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {n.type === 'workout_suggestion' ? <Dumbbell size={16} /> : <AlertCircle size={16} />}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                        <div style={{ fontSize: 13, fontWeight: n.is_read ? 600 : 700, color: "var(--color-text)", lineHeight: 1.2 }}>
                          {n.title}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--color-text-3)", marginBottom: 8, lineHeight: 1.4 }}>
                        {n.message}
                      </div>

                      {n.type === 'workout_suggestion' && n.data?.program_note && (
                        <div style={{
                          background: "rgba(245, 158, 11, 0.1)", color: "#F59E0B", padding: "8px 12px",
                          borderRadius: 8, fontSize: 12, marginBottom: 12, fontStyle: "italic",
                          borderLeft: "3px solid #F59E0B"
                        }}>
                          "{n.data.program_note}"
                        </div>
                      )}

                      {n.type === 'workout_suggestion' && n.data && (
                        <button
                          onClick={() => handleAddWorkout(n)}
                          style={{
                            background: "var(--aura-accent)", color: "#000", border: "none",
                            padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                            display: "flex", alignItems: "center", gap: 4, cursor: "pointer"
                          }}
                        >
                          <Plus size={12} /> Add Program to Templates
                        </button>
                      )}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                      <div style={{ fontSize: 10, color: "var(--color-text-3)", whiteSpace: "nowrap" }}>
                        {new Date(n.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </div>
                      {!n.is_read && (
                        <button
                          onClick={() => handleMarkRead(n.id)}
                          style={{ background: "none", border: "none", color: "var(--aura-accent)", cursor: "pointer", padding: 4 }}
                          title="Mark as read"
                        >
                          <CheckCircle size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
