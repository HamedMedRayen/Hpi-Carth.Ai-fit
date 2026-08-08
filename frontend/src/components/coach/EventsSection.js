import React, { useState, useEffect, useCallback } from "react";
import {
  Trophy, Calendar, MapPin, Plus, Flame, Users, Clock, Video,
  CheckCircle2, X, Filter, Sparkles, Trash2, ShieldCheck, Dumbbell,
  Award, MessageSquare, AlertCircle, ExternalLink, UserCheck, Lock, Globe
} from "lucide-react";
import { useAuth } from "../../utils/auth";
import { api } from "../../utils/api";
import { useToast } from "../common/Toast";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

export default function EventsSection() {
  const { user } = useAuth();
  const toast = useToast();
  const isCoach = user?.role === "coach";

  const EVENT_TYPES = [
    {
      id: "all",
      label: "All Sessions",
      description: "Browse all live classes, workshops, and coaching events suitable for all fitness levels.",
      icon: Trophy
    },
    {
      id: "workshop",
      label: "Form & Technique",
      description: "Form Clinics: Learn step-by-step exercise form, lifting mechanics, and injury prevention safely.",
      icon: Award
    },
    {
      id: "bootcamp",
      label: "High-Energy Cardio",
      description: "High-Energy Cardio: Fun, calorie-burning group workouts designed to boost endurance and stamina.",
      icon: Flame
    },
    {
      id: "group_workout",
      label: "Live Group Workouts",
      description: "Live Workouts: Train together in real-time following along with a certified coach.",
      icon: Dumbbell
    },
    {
      id: "qa_session",
      label: "Ask a Coach (Q&A)",
      description: "Ask a Coach: Open video Q&A sessions to get expert advice on your training, nutrition, and recovery.",
      icon: Video
    },
  ];

  const showToast = useCallback((msg, type = "info") => {
    if (!toast) return;
    if (typeof toast.show === "function") {
      toast.show(msg, type);
    } else if (type === "error" && typeof toast.error === "function") {
      toast.error(msg);
    } else if (type === "success" && typeof toast.success === "function") {
      toast.success(msg);
    } else if (typeof toast.info === "function") {
      toast.info(msg);
    }
  }, [toast]);

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [registeringId, setRegisteringId] = useState(null);

  // Form State for Event Creation
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState("workshop");
  const [eventDate, setEventDate] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [locationType, setLocationType] = useState("in_person");
  const [locationDetail, setLocationDetail] = useState("Lac 2 Fitness Gym, Tunis");
  const [maxParticipants, setMaxParticipants] = useState(20);
  const [costTnd, setCostTnd] = useState(0);
  const [targetAudience, setTargetAudience] = useState("public");
  const [coverPosterFile, setCoverPosterFile] = useState(null);
  const [posterPreview, setPosterPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const triggerHaptic = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } catch {}
    }
  };

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get(`/events?event_type=${activeFilter}`);
      setEvents(data || []);
    } catch (err) {
      console.error("Failed to load events:", err);
      showToast("Failed to load community events", "error");
    } finally {
      setLoading(false);
    }
  }, [activeFilter, toast]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Handle Event Poster File Selection
  const handlePosterChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCoverPosterFile(file);
      setPosterPreview(URL.createObjectURL(file));
    }
  };

  // Submit New Event (Coach Only)
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!title.trim() || !eventDate) {
      showToast("Please provide a title and date/time for the event", "error");
      return;
    }

    try {
      setSubmitting(true);
      triggerHaptic();

      let posterUrl = null;
      if (coverPosterFile) {
        const formData = new FormData();
        formData.append("file", coverPosterFile);
        const uploadRes = await api.uploadEventPoster(formData);
        posterUrl = uploadRes?.poster_url;
      }

      await api.post("/events", {
        title,
        description,
        event_type: eventType,
        event_date: eventDate,
        duration_minutes: Number(durationMinutes),
        location_type: locationType,
        location_detail: locationDetail,
        max_participants: Number(maxParticipants),
        cost_tnd: Number(costTnd) || 0,
        target_audience: targetAudience,
        cover_image_url: posterUrl
      });

      showToast("Community event posted successfully!", "success");
      setShowCreateModal(false);
      // Reset form
      setTitle("");
      setDescription("");
      setCostTnd(0);
      setTargetAudience("public");
      setCoverPosterFile(null);
      setPosterPreview(null);
      fetchEvents();
    } catch (err) {
      console.error("Error creating event:", err);
      showToast(err.message || "Failed to post event", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle RSVP / Registration for an event
  const handleToggleRegister = async (event) => {
    try {
      setRegisteringId(event.id);
      triggerHaptic();

      if (event.is_registered) {
        await api.post(`/events/${event.id}/unregister`);
        showToast(`Unsubscribed from "${event.title}"`, "info");
      } else {
        await api.post(`/events/${event.id}/register`);
        showToast(`Registered for "${event.title}"!`, "success");
      }

      // Optimistic update
      setEvents((prev) =>
        prev.map((e) => {
          if (e.id === event.id) {
            const newIsReg = !e.is_registered;
            return {
              ...e,
              is_registered: newIsReg,
              registered_count: newIsReg
                ? e.registered_count + 1
                : Math.max(0, e.registered_count - 1),
            };
          }
          return e;
        })
      );
    } catch (err) {
      showToast(err.message || "Failed to update registration", "error");
    } finally {
      setRegisteringId(null);
    }
  };

  // Delete Event (Coach Host Only)
  const handleDeleteEvent = async (eventId, eventTitle) => {
    if (!window.confirm(`Are you sure you want to cancel and remove "${eventTitle}"?`)) return;
    try {
      triggerHaptic();
      await api.delete(`/events/${eventId}`);
      showToast("Event cancelled and removed", "success");
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch (err) {
      showToast(err.message || "Failed to delete event", "error");
    }
  };

  // Date Formatting Helper
  const formatEventTime = (isoString) => {
    if (!isoString) return { dateStr: "", timeStr: "", countdown: "" };
    const date = new Date(isoString);
    const dateStr = date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric"
    });
    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit"
    });

    const diffDays = Math.ceil((date - new Date()) / (1000 * 60 * 60 * 24));
    let countdown = "Upcoming";
    if (diffDays === 0) countdown = "Today";
    else if (diffDays === 1) countdown = "Tomorrow";
    else if (diffDays > 1) countdown = `In ${diffDays} days`;

    return { dateStr, timeStr, countdown };
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: "8px 0" }}>
      {/* Top Banner Header: Purpose */}
      <div style={{
        background: "var(--bg-glass, rgba(15, 23, 42, 0.6))",
        border: "1px solid var(--border-card, rgba(255, 255, 255, 0.08))",
        borderRadius: 24,
        padding: "28px 32px",
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: "color-mix(in srgb, var(--aura-accent) 15%, transparent)",
              border: "1px solid color-mix(in srgb, var(--aura-accent) 30%, transparent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--aura-accent)",
              flexShrink: 0,
            }}>
              <Trophy size={26} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "var(--color-text)", letterSpacing: "-0.5px", display: "flex", alignItems: "center", gap: 10 }}>
                Community Events
                <span style={{
                  fontSize: 11,
                  fontWeight: 800,
                  padding: "3px 10px",
                  borderRadius: 12,
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "#10b981",
                  border: "1px solid rgba(16, 185, 129, 0.3)"
                }}>
                  Open to All Users
                </span>
              </div>
              <div style={{ fontSize: 13, color: "var(--color-text-3)", marginTop: 4 }}>
                Live workshops, bootcamps and coaching sessions hosted by certified trainers.
              </div>
            </div>
          </div>

          {isCoach && (
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 20px",
                borderRadius: 14,
                background: "var(--aura-accent)",
                color: "#fff",
                border: "none",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(139, 92, 246, 0.3)",
                transition: "transform 0.2s, boxShadow 0.2s"
              }}
            >
              <Plus size={18} />
              Host New Event
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        overflowX: "auto",
        paddingBottom: 4,
        scrollbarWidth: "none"
      }}>
        {EVENT_TYPES.map((t) => {
          const Icon = t.icon || Trophy;
          const isActive = activeFilter === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                triggerHaptic();
                setActiveFilter(t.id);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 18px",
                borderRadius: 12,
                border: isActive
                  ? "1px solid var(--aura-accent)"
                  : "1px solid var(--color-border, rgba(255, 255, 255, 0.08))",
                background: isActive
                  ? "color-mix(in srgb, var(--aura-accent) 15%, transparent)"
                  : "var(--id-surface, rgba(255, 255, 255, 0.03))",
                color: isActive ? "var(--color-text)" : "var(--color-text-3)",
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.2s ease"
              }}
            >
              {Icon ? (
                <Icon size={16} style={{ color: isActive ? "var(--aura-accent)" : "inherit" }} />
              ) : (
                <Trophy size={16} style={{ color: isActive ? "var(--aura-accent)" : "inherit" }} />
              )}
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Active Category Beginner Explanation Banner */}
      {activeFilter && (
        <div style={{
          padding: "10px 16px",
          borderRadius: 12,
          background: "color-mix(in srgb, var(--aura-accent) 8%, transparent)",
          border: "1px solid color-mix(in srgb, var(--aura-accent) 20%, transparent)",
          fontSize: 12.5,
          fontWeight: 600,
          color: "var(--color-text-2, #cbd5e1)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          lineHeight: 1.4,
        }}>
          {EVENT_TYPES.find(t => t.id === activeFilter)?.description}
        </div>
      )}

      {/* Events Grid */}
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-3)" }}>
          Loading community events...
        </div>
      ) : events.length === 0 ? (
        <div style={{
          padding: 48,
          textAlign: "center",
          background: "var(--bg-glass, rgba(15, 23, 42, 0.6))",
          border: "1px dashed rgba(255, 255, 255, 0.12)",
          borderRadius: 24,
        }}>
          <Trophy size={42} style={{ color: "var(--aura-accent)", marginBottom: 12, opacity: 0.8 }} />
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--color-text)", margin: "0 0 8px" }}>
            No Events Found
          </h3>
          <p style={{ fontSize: 13, color: "var(--color-text-3)", maxWidth: 420, margin: "0 auto 20px" }}>
            There are currently no events matching this category. Check back soon or create your own event if you are a coach!
          </p>
        </div>
      ) : (
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 16
        }}>
          {events.map((ev) => {
            const { dateStr, timeStr, countdown } = formatEventTime(ev.event_date);
            const isHost = user?.id === ev.coach_id;
            const isFull = ev.max_participants && ev.registered_count >= ev.max_participants && !ev.is_registered;

            const categoryLabels = {
              workshop: "Form & Technique",
              bootcamp: "High-Energy Cardio",
              group_workout: "Live Group Workout",
              qa_session: "Ask a Coach Q&A",
            };

            return (
              <div
                key={ev.id}
                style={{
                  background: "var(--bg-glass, rgba(15, 23, 42, 0.75))",
                  border: ev.is_registered
                    ? "1px solid rgba(16, 185, 129, 0.4)"
                    : "1px solid var(--border-card, rgba(255, 255, 255, 0.08))",
                  borderRadius: 20,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "stretch",
                  backdropFilter: "blur(16px)",
                  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
                  transition: "transform 0.2s ease, border-color 0.2s ease",
                  minHeight: 180,
                  flexWrap: "wrap"
                }}
              >
                {/* Left: Event Poster Image */}
                <div style={{
                  width: 220,
                  minWidth: 180,
                  position: "relative",
                  background: "rgba(0,0,0,0.4)",
                  overflow: "hidden",
                  flexShrink: 0
                }}>
                  {ev.cover_image_url ? (
                    <img
                      src={ev.cover_image_url}
                      alt={ev.title}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div style={{
                      width: "100%",
                      height: "100%",
                      background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--aura-accent)"
                    }}>
                      <Trophy size={42} />
                    </div>
                  )}

                  {/* Countdown & Cost Badges on Poster */}
                  <div style={{
                    position: "absolute",
                    top: 10,
                    left: 10,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    alignItems: "flex-start"
                  }}>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 800,
                      padding: "3px 8px",
                      borderRadius: 8,
                      background: "rgba(15, 23, 42, 0.85)",
                      color: "#38bdf8",
                      backdropFilter: "blur(8px)",
                      border: "1px solid rgba(56, 189, 248, 0.3)"
                    }}>
                      {countdown}
                    </span>

                    <span style={{
                      fontSize: 10,
                      fontWeight: 800,
                      padding: "3px 8px",
                      borderRadius: 8,
                      background: ev.cost_tnd > 0 ? "rgba(16, 185, 129, 0.25)" : "rgba(139, 92, 246, 0.25)",
                      color: ev.cost_tnd > 0 ? "#10b981" : "#a78bfa",
                      backdropFilter: "blur(8px)",
                      border: ev.cost_tnd > 0 ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(139, 92, 246, 0.4)"
                    }}>
                      {ev.cost_tnd > 0 ? `${ev.cost_tnd} TND` : "Free Entry"}
                    </span>

                    <span style={{
                      fontSize: 10,
                      fontWeight: 800,
                      padding: "3px 8px",
                      borderRadius: 8,
                      background: ev.target_audience === 'adherents_only' ? "rgba(245, 158, 11, 0.25)" : "rgba(59, 130, 246, 0.25)",
                      color: ev.target_audience === 'adherents_only' ? "#f59e0b" : "#60a5fa",
                      backdropFilter: "blur(8px)",
                      border: ev.target_audience === 'adherents_only' ? "1px solid rgba(245, 158, 11, 0.4)" : "1px solid rgba(59, 130, 246, 0.4)",
                      display: "flex",
                      alignItems: "center",
                      gap: 4
                    }}>
                      {ev.target_audience === 'adherents_only' ? (
                        <>
                          <Lock size={10} /> Adherents Only
                        </>
                      ) : (
                        <>
                          <Globe size={10} /> Public
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Middle & Right Content Wrapper */}
                <div style={{
                  padding: "20px 24px",
                  display: "flex",
                  flex: 1,
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 20,
                  flexWrap: "wrap"
                }}>
                  {/* Middle Main Information */}
                  <div style={{ flex: 1, minWidth: 260, display: "flex", flexDirection: "column", gap: 10 }}>
                    {/* Top Row: Category Badge & Host Delete Button */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 800,
                        padding: "3px 10px",
                        borderRadius: 8,
                        background: "color-mix(in srgb, var(--aura-accent) 15%, transparent)",
                        color: "var(--aura-accent)",
                        border: "1px solid color-mix(in srgb, var(--aura-accent) 30%, transparent)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4
                      }}>
                        <Sparkles size={12} />
                        {categoryLabels[ev.event_type] || "Event"}
                      </span>

                      {isHost && (
                        <button
                          onClick={() => handleDeleteEvent(ev.id, ev.title)}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 8,
                            background: "rgba(239, 68, 68, 0.15)",
                            border: "1px solid rgba(239, 68, 68, 0.3)",
                            color: "#ef4444",
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 4
                          }}
                          title="Cancel Event"
                        >
                          <Trash2 size={13} /> Cancel Event
                        </button>
                      )}
                    </div>

                    <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--color-text)", margin: 0, lineHeight: 1.3 }}>
                      {ev.title}
                    </h3>

                    {/* Coach Profile Mini Card */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <img
                        src={ev.coach_avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"}
                        alt={ev.coach_name}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          objectFit: "cover",
                          border: "1px solid color-mix(in srgb, var(--aura-accent) 30%, transparent)"
                        }}
                      />
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)", display: "flex", alignItems: "center", gap: 6 }}>
                        Coach {ev.coach_name}
                        <ShieldCheck size={14} style={{ color: "var(--aura-accent)" }} />
                      </div>
                    </div>

                    {/* Description */}
                    {ev.description && (
                      <p style={{
                        fontSize: 12.5,
                        color: "var(--color-text-3)",
                        lineHeight: 1.4,
                        margin: 0,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden"
                      }}>
                        {ev.description}
                      </p>
                    )}

                    {/* Event Details Badges (Date, Time, Location) */}
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      fontSize: 12,
                      color: "var(--color-text-2)",
                      flexWrap: "wrap"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Calendar size={14} style={{ color: "var(--aura-accent)" }} />
                        <span>{dateStr} • {timeStr} ({ev.duration_minutes}m)</span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <MapPin size={14} style={{ color: "#38bdf8" }} />
                        <span>{ev.location_detail || "Tunis, Tunisia"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Action Column */}
                  <div style={{
                    width: 200,
                    minWidth: 170,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    alignItems: "stretch",
                    justifyContent: "center",
                    paddingLeft: 16,
                    borderLeft: "1px solid var(--color-border, rgba(255, 255, 255, 0.06))"
                  }}>
                    {/* Seat Capacity Progress */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: "var(--color-text-3)", marginBottom: 4 }}>
                        <span>Reserved</span>
                        <span>{ev.registered_count} / {ev.max_participants || "∞"}</span>
                      </div>
                      <div style={{
                        height: 6,
                        borderRadius: 3,
                        background: "rgba(255,255,255,0.1)",
                        overflow: "hidden"
                      }}>
                        <div style={{
                          height: "100%",
                          width: `${Math.min(100, (ev.registered_count / (ev.max_participants || 20)) * 100)}%`,
                          background: isFull
                            ? "#ef4444"
                            : ev.is_registered
                            ? "#10b981"
                            : "var(--aura-accent)",
                          borderRadius: 3,
                          transition: "width 0.3s ease"
                        }} />
                      </div>
                    </div>

                    {/* Attendee Avatars Stack */}
                    {ev.attendees && ev.attendees.length > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ display: "flex", alignItems: "center" }}>
                          {ev.attendees.map((att, index) => (
                            <img
                              key={att.user_id}
                              src={att.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"}
                              alt={att.name}
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: "50%",
                                border: "2px solid #0f172a",
                                marginLeft: index === 0 ? 0 : -6,
                                objectFit: "cover"
                              }}
                            />
                          ))}
                        </div>
                        <span style={{ fontSize: 10, color: "var(--color-text-3)" }}>
                          +{Math.max(0, ev.registered_count - ev.attendees.length)}
                        </span>
                      </div>
                    )}

                    {/* Register Action Button */}
                    <button
                      onClick={() => handleToggleRegister(ev)}
                      disabled={registeringId === ev.id || isFull}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: 12,
                        border: "none",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: isFull ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        background: ev.is_registered
                          ? "rgba(16, 185, 129, 0.2)"
                          : isFull
                          ? "rgba(255, 255, 255, 0.05)"
                          : "var(--aura-accent)",
                        color: ev.is_registered
                          ? "#10b981"
                          : isFull
                          ? "var(--color-text-3)"
                          : "#fff",
                        outline: ev.is_registered ? "1px solid rgba(16, 185, 129, 0.4)" : "none",
                        transition: "transform 0.15s ease, background 0.2s ease"
                      }}
                    >
                      {registeringId === ev.id ? (
                        "Updating..."
                      ) : ev.is_registered ? (
                        <>
                          <UserCheck size={15} />
                          Registered ✓
                        </>
                      ) : isFull ? (
                        "Fully Booked"
                      ) : (
                        "Register for Free"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create Event (Coach Only) */}
      {showCreateModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: 20
        }}>
          <div style={{
            background: "var(--color-bg1, #0f172a)",
            border: "1px solid var(--border-card, rgba(255, 255, 255, 0.12))",
            borderRadius: 24,
            width: "100%",
            maxWidth: 540,
            padding: 28,
            maxHeight: "90vh",
            overflowY: "auto",
            boxShadow: "0 20px 50px rgba(0,0,0,0.5)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                <Trophy size={20} style={{ color: "#f59e0b" }} />
                Host a Community Event
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: "none", border: "none", color: "var(--color-text-2)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-2)", display: "block", marginBottom: 6 }}>
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lac 2 Bench Press & Hypertrophy Clinic"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#fff",
                    fontSize: 13
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-2)", display: "block", marginBottom: 6 }}>
                    Event Type
                  </label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 12,
                      background: "#1e293b",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#fff",
                      fontSize: 13
                    }}
                  >
                    <option value="workshop">Form & Technique (Lifting mechanics & safety)</option>
                    <option value="bootcamp">High-Energy Cardio (Calorie burning & stamina)</option>
                    <option value="group_workout">Live Group Workout (Interactive training)</option>
                    <option value="qa_session">Ask a Coach Q&A (Live Q&A advice)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-2)", display: "block", marginBottom: 6 }}>
                    Max Seats / Capacity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#fff",
                      fontSize: 13
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-2)", display: "block", marginBottom: 6 }}>
                    Price / Entry Fee (TND)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0 for Free"
                    value={costTnd}
                    onChange={(e) => setCostTnd(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#fff",
                      fontSize: 13
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-2)", display: "block", marginBottom: 6 }}>
                    Target Audience / Visibility
                  </label>
                  <select
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 12,
                      background: "#1e293b",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#fff",
                      fontSize: 13
                    }}
                  >
                    <option value="public">Public (Open to all platform users)</option>
                    <option value="adherents_only">Adherents Only (Private to my active athletes)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-2)", display: "block", marginBottom: 6 }}>
                    Date & Start Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#fff",
                      fontSize: 13
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-2)", display: "block", marginBottom: 6 }}>
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min="15"
                    step="15"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#fff",
                      fontSize: 13
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-2)", display: "block", marginBottom: 6 }}>
                  Location Address / Gym Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lac 2 Fitness Gym, Sidi Bou Said Park, or Online Zoom Link"
                  value={locationDetail}
                  onChange={(e) => setLocationDetail(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#fff",
                    fontSize: 13
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-2)", display: "block", marginBottom: 6 }}>
                  Description & Agenda
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe what athletes will learn or experience..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#fff",
                    fontSize: 13,
                    resize: "vertical"
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-2)", display: "block", marginBottom: 6 }}>
                  Upload Cover Poster Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePosterChange}
                  style={{ fontSize: 12, color: "var(--color-text-2)" }}
                />
                {posterPreview && (
                  <img
                    src={posterPreview}
                    alt="Poster Preview"
                    style={{
                      width: "100%",
                      height: 120,
                      objectFit: "cover",
                      borderRadius: 12,
                      marginTop: 10,
                      border: "1px solid rgba(245, 158, 11, 0.4)"
                    }}
                  />
                )}
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#fff",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1.5,
                    padding: "12px",
                    borderRadius: 12,
                    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                    border: "none",
                    color: "#fff",
                    fontWeight: 800,
                    cursor: "pointer"
                  }}
                >
                  {submitting ? "Posting..." : "Publish Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
