import React, { useState, useEffect, useMemo } from "react";
import { 
  Calendar as CalendarIcon, Clock, Plus, Users, CheckCircle, Info, 
  ChevronLeft, ChevronRight, MapPin, AlertCircle, Trash2, Check, X, RefreshCw 
} from "lucide-react";
import { api } from "../../utils/api";
import { resolveBackendUrl } from "../../utils/config";

// Date utilities
const getStartOfWeek = (d) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
  return new Date(date.setDate(diff));
};

const formatDateStr = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatTime12h = (isoString) => {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

const HOURS = [
  "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", 
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"
];

export default function ScheduleSection() {
  const [viewMode, setViewMode] = useState("week"); // 'week' | 'month'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [items, setItems] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Booking Modal State
  const [showBookModal, setShowBookModal] = useState(false);
  const [modalData, setModalData] = useState({
    athlete_id: "",
    title: "",
    item_type: "session",
    date: formatDateStr(new Date()),
    start_time: "10:00",
    duration: "60",
    location: "Gym",
    recurrence_rule: "none",
    recurrence_count: 4
  });
  const [modalError, setModalError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Detail Popover / Modal State
  const [selectedItem, setSelectedItem] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Computed Date Ranges
  const weekDays = useMemo(() => {
    const start = getStartOfWeek(currentDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentDate]);

  const monthGrid = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Day of week offset (0 for Mon, 6 for Sun)
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days = [];
    // Padding from previous month
    for (let i = startDayOfWeek; i > 0; i--) {
      const prevDate = new Date(year, month, 1 - i);
      days.push({ date: prevDate, isCurrentMonth: false });
    }
    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    // Remaining padding to complete 35/42 cells
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
      }
    }
    return days;
  }, [currentDate]);

  // Fetch Schedule and Active Athletes
  const fetchScheduleData = async () => {
    setLoading(true);
    try {
      let startStr = "";
      let endStr = "";
      if (viewMode === 'week') {
        startStr = formatDateStr(weekDays[0]);
        endStr = formatDateStr(weekDays[6]);
      } else {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        startStr = formatDateStr(new Date(year, month, 1));
        endStr = formatDateStr(new Date(year, month + 1, 0));
      }

      const [schedRes, athRes] = await Promise.all([
        api.getCoachSchedule(startStr, endStr).catch(() => []),
        api.getMyAthletes().catch(() => [])
      ]);

      setItems(Array.isArray(schedRes) ? schedRes : []);
      const activeAth = (Array.isArray(athRes) ? athRes : []).filter(a => a.status === 'active');
      setAthletes(activeAth);
    } catch (err) {
      console.error("Failed to load coach schedule:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduleData();
  }, [viewMode, currentDate]);

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setMonth(d.getMonth() - 1);
      setCurrentDate(d);
    }
  };

  const handleNext = () => {
    if (viewMode === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setMonth(d.getMonth() + 1);
      setCurrentDate(d);
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Open booking modal for a specific day / time
  const handleOpenBookModal = (dateStr = null, timeStr = "10:00") => {
    setModalError(null);
    const startHour = parseInt(timeStr.split(":")[0]) || 10;
    const startMin = timeStr.split(":")[1] || "00";
    const endHourStr = String((startHour + 1) % 24).padStart(2, '0');
    const endTimeStr = `${endHourStr}:${startMin}`;

    setModalData({
      athlete_id: athletes[0]?.athlete_id || "",
      title: "",
      item_type: "session",
      date: dateStr || formatDateStr(new Date()),
      start_time: timeStr,
      end_time: endTimeStr,
      duration: "60",
      location: "Gym",
      recurrence_rule: "none",
      recurrence_count: 4
    });
    setShowBookModal(true);
  };

  // Handle Start Time Change -> Auto recalculate End Time
  const handleStartTimeChange = (newStartTime) => {
    const durMins = parseInt(modalData.duration) || 60;
    const [h, m] = newStartTime.split(":").map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      const startDt = new Date(2000, 0, 1, h, m);
      const endDt = new Date(startDt.getTime() + durMins * 60000);
      const endH = String(endDt.getHours()).padStart(2, '0');
      const endM = String(endDt.getMinutes()).padStart(2, '0');
      setModalData(prev => ({ ...prev, start_time: newStartTime, end_time: `${endH}:${endM}` }));
    } else {
      setModalData(prev => ({ ...prev, start_time: newStartTime }));
    }
  };

  // Handle End Time Change -> Calculate Duration
  const handleEndTimeChange = (newEndTime) => {
    const [sh, sm] = modalData.start_time.split(":").map(Number);
    const [eh, em] = newEndTime.split(":").map(Number);
    if (!isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em)) {
      const startDt = new Date(2000, 0, 1, sh, sm);
      const endDt = new Date(2000, 0, 1, eh, em);
      let diffMs = endDt.getTime() - startDt.getTime();
      if (diffMs <= 0) diffMs += 24 * 3600 * 1000;
      const diffMins = Math.round(diffMs / 60000);
      setModalData(prev => ({ ...prev, end_time: newEndTime, duration: String(diffMins) }));
    } else {
      setModalData(prev => ({ ...prev, end_time: newEndTime }));
    }
  };

  // Handle Preset Duration Click
  const handleDurationPreset = (durMins) => {
    const [h, m] = modalData.start_time.split(":").map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      const startDt = new Date(2000, 0, 1, h, m);
      const endDt = new Date(startDt.getTime() + durMins * 60000);
      const endH = String(endDt.getHours()).padStart(2, '0');
      const endM = String(endDt.getMinutes()).padStart(2, '0');
      setModalData(prev => ({ ...prev, duration: String(durMins), end_time: `${endH}:${endM}` }));
    }
  };

  // Submit booking form
  const handleBookSubmit = async (e) => {
    e.preventDefault();
    setModalError(null);

    if (modalData.item_type === 'session' && !modalData.athlete_id) {
      setModalError("Please select an athlete for a 1-on-1 session.");
      return;
    }

    setSubmitting(true);
    try {
      const startIso = `${modalData.date}T${modalData.start_time}:00Z`;
      const endIso = `${modalData.date}T${modalData.end_time}:00Z`;

      if (new Date(endIso) <= new Date(startIso)) {
        setModalError("End time must be later than start time.");
        setSubmitting(false);
        return;
      }

      const defaultTitle = modalData.item_type === 'availability_block' 
        ? "Open Availability Slot" 
        : modalData.item_type === 'event' 
        ? "Gym Event" 
        : "1-on-1 Coaching Session";

      const payload = {
        athlete_id: modalData.item_type === 'session' ? parseInt(modalData.athlete_id) : null,
        title: modalData.title.trim() || defaultTitle,
        item_type: modalData.item_type,
        start_time: startIso,
        end_time: endIso,
        location: modalData.location || "Gym",
        recurrence_rule: modalData.recurrence_rule === 'none' ? null : modalData.recurrence_rule,
        recurrence_count: parseInt(modalData.recurrence_count || 1)
      };

      await api.createScheduleItem(payload);
      setShowBookModal(false);
      fetchScheduleData();
    } catch (err) {
      setModalError(err.message || "Failed to book schedule slot.");
    } finally {
      setSubmitting(false);
    }
  };

  // Status & Delete Actions
  const handleUpdateStatus = async (itemId, newStatus) => {
    setActionLoading(true);
    try {
      await api.updateScheduleItem(itemId, { status: newStatus });
      setSelectedItem(null);
      fetchScheduleData();
    } catch (err) {
      alert(err.message || "Failed to update session status.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm("Are you sure you want to cancel this session slot?")) return;
    setActionLoading(true);
    try {
      await api.deleteScheduleItem(itemId);
      setSelectedItem(null);
      fetchScheduleData();
    } catch (err) {
      alert(err.message || "Failed to delete session slot.");
    } finally {
      setActionLoading(false);
    }
  };

  const getItemDateStr = (rawStr) => {
    if (!rawStr) return "";
    const clean = rawStr.replace(" ", "T");
    const d = new Date(clean);
    if (!isNaN(d.getTime())) return formatDateStr(d);
    return rawStr.split("T")[0] || rawStr.split(" ")[0] || "";
  };

  const getItemHourStr = (rawStr) => {
    if (!rawStr) return "";
    const clean = rawStr.replace(" ", "T");
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      const h = String(d.getHours()).padStart(2, '0');
      return `${h}:00`;
    }
    const part = rawStr.split("T")[1] || rawStr.split(" ")[1] || "";
    return `${part.substring(0, 2)}:00`;
  };

  // Filter items per date / time
  const getItemsForDate = (dateStr) => {
    return items.filter(item => {
      return getItemDateStr(item.start_time) === dateStr;
    });
  };

  const getItemsForSlot = (dateStr, hourStr) => {
    const dayItems = getItemsForDate(dateStr);
    return dayItems.filter(item => {
      return getItemHourStr(item.start_time) === hourStr;
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: "8px 0" }}>
      {/* Top Banner Header */}
      <div style={{
        background: "linear-gradient(135deg, rgba(6, 182, 212, 0.12) 0%, rgba(59, 130, 246, 0.08) 100%)",
        border: "1px solid rgba(6, 182, 212, 0.25)",
        borderRadius: 24,
        padding: 28,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 20
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            background: "rgba(6, 182, 212, 0.2)",
            border: "1px solid rgba(6, 182, 212, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--aura-cyan, #06b6d4)",
          }}>
            <CalendarIcon size={28} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-0.5px" }}>
              Coach Schedule & Calendar Workspace
            </div>
            <div style={{ fontSize: 13, color: "var(--color-text-2)", marginTop: 4 }}>
              Single source of truth for 1-on-1 athlete sessions, free availability, and recurring slots.
            </div>
          </div>
        </div>

        <button
          onClick={() => handleOpenBookModal()}
          className="btn-primary"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 20px",
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 800,
            cursor: "pointer",
            width: "auto"
          }}
        >
          <Plus size={16} /> Book Session / Slot
        </button>
      </div>

      {/* Main Calendar Card */}
      <div style={{
        background: "var(--bg-glass, rgba(15, 23, 42, 0.6))",
        border: "1px solid var(--border-card, rgba(255, 255, 255, 0.08))",
        borderRadius: 24,
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 20,
        backdropFilter: "blur(16px)"
      }}>
        {/* Calendar Navigation & View Toggle Toolbar */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          paddingBottom: 16
        }}>
          {/* Navigation Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={handlePrev}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid var(--border-card)",
                borderRadius: 10,
                padding: "8px 12px",
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center"
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={handleNext}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid var(--border-card)",
                borderRadius: 10,
                padding: "8px 12px",
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center"
              }}
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={handleToday}
              style={{
                background: "rgba(6, 182, 212, 0.1)",
                border: "1px solid rgba(6, 182, 212, 0.2)",
                borderRadius: 10,
                padding: "8px 16px",
                color: "var(--aura-cyan)",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              Today
            </button>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginLeft: 8 }}>
              {viewMode === 'week' ? (
                `${weekDays[0].toLocaleDateString([], { month: 'short', day: 'numeric' })} — ${weekDays[6].toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`
              ) : (
                currentDate.toLocaleDateString([], { month: 'long', year: 'numeric' })
              )}
            </div>
          </div>

          {/* View Mode Segmented Buttons */}
          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--border-card)",
            borderRadius: 12,
            padding: 4,
            display: "flex",
            gap: 4
          }}>
            <button
              onClick={() => setViewMode("week")}
              style={{
                background: viewMode === "week" ? "var(--aura-cyan)" : "transparent",
                color: viewMode === "week" ? "#000" : "var(--color-text-2)",
                border: "none",
                borderRadius: 8,
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              Week View
            </button>
            <button
              onClick={() => setViewMode("month")}
              style={{
                background: viewMode === "month" ? "var(--aura-cyan)" : "transparent",
                color: viewMode === "month" ? "#000" : "var(--color-text-2)",
                border: "none",
                borderRadius: 8,
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              Month View
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--color-text-3)" }}>
            Loading calendar schedule...
          </div>
        ) : viewMode === 'week' ? (
          /* WEEK VIEW GRID */
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: 760 }}>
              {/* Header Days Row */}
              <div style={{ display: "grid", gridTemplateColumns: "60px repeat(7, 1fr)", gap: 6, marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-3)", padding: "6px 4px" }}>TIME</div>
                {weekDays.map((d, idx) => {
                  const isToday = formatDateStr(d) === formatDateStr(new Date());
                  return (
                    <div
                      key={idx}
                      style={{
                        background: isToday ? "rgba(6, 182, 212, 0.12)" : "rgba(255,255,255,0.02)",
                        border: isToday ? "1px solid var(--aura-cyan)" : "1px solid var(--border-card)",
                        borderRadius: 10,
                        padding: "6px 4px",
                        textAlign: "center"
                      }}
                    >
                      <div style={{ fontSize: 10, fontWeight: 700, color: isToday ? "var(--aura-cyan)" : "var(--color-text-3)", textTransform: "uppercase" }}>
                        {d.toLocaleDateString([], { weekday: 'short' })}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 900, color: isToday ? "#fff" : "var(--color-text)" }}>
                        {d.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Scrollable Time Slots Grid Rows */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 460, overflowY: "auto", paddingRight: 4 }}>
                {HOURS.map(hour => (
                  <div key={hour} style={{ display: "grid", gridTemplateColumns: "60px repeat(7, 1fr)", gap: 6, minHeight: 46 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-3)", paddingTop: 6 }}>
                      {hour}
                    </div>
                    {weekDays.map((d, idx) => {
                      const dateStr = formatDateStr(d);
                      const slotItems = getItemsForSlot(dateStr, hour);

                      return (
                        <div
                          key={idx}
                          onClick={() => slotItems.length === 0 && handleOpenBookModal(dateStr, hour)}
                          style={{
                            background: slotItems.length > 0 ? "transparent" : "rgba(255,255,255,0.015)",
                            border: "1px dashed rgba(255,255,255,0.06)",
                            borderRadius: 8,
                            padding: 3,
                            cursor: slotItems.length === 0 ? "pointer" : "default",
                            position: "relative",
                            transition: "background 0.2s ease"
                          }}
                          onMouseEnter={e => {
                            if (slotItems.length === 0) e.currentTarget.style.background = "rgba(6, 182, 212, 0.05)";
                          }}
                          onMouseLeave={e => {
                            if (slotItems.length === 0) e.currentTarget.style.background = "rgba(255,255,255,0.015)";
                          }}
                        >
                          {slotItems.map(item => {
                            const isBlock = item.item_type === 'availability_block';
                            const isEvent = item.item_type === 'event';
                            const bg = isBlock 
                              ? "rgba(16, 185, 129, 0.15)" 
                              : isEvent 
                              ? "rgba(139, 92, 246, 0.15)" 
                              : "rgba(6, 182, 212, 0.15)";
                            const borderColor = isBlock ? "#10b981" : isEvent ? "#8b5cf6" : "var(--aura-cyan)";
                            const textColor = isBlock ? "#34d399" : isEvent ? "#c084fc" : "#38bdf8";

                            return (
                              <div
                                key={item.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedItem(item);
                                }}
                                style={{
                                  background: bg,
                                  border: `1px solid ${borderColor}`,
                                  borderRadius: 6,
                                  padding: "4px 6px",
                                  marginBottom: 2,
                                  cursor: "pointer",
                                  fontSize: 10,
                                  boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
                                }}
                              >
                                <div style={{ fontWeight: 800, color: textColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {item.title}
                                </div>
                                <div style={{ fontSize: 9, color: "var(--color-text-2)", marginTop: 1, display: "flex", alignItems: "center", gap: 3 }}>
                                  <Clock size={9} /> {formatTime12h(item.start_time)} - {formatTime12h(item.end_time)}
                                </div>
                                {item.athlete_name && (
                                  <div style={{ fontSize: 9, color: "#fff", fontWeight: 700, marginTop: 1, display: "flex", alignItems: "center", gap: 3 }}>
                                    <Users size={9} /> {item.athlete_name}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* MONTH VIEW GRID */
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 6, textAlign: "center" }}>
              {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map(day => (
                <div key={day} style={{ fontSize: 10, fontWeight: 800, color: "var(--color-text-3)", padding: 4 }}>
                  {day}
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
              {monthGrid.map((cell, idx) => {
                const dateStr = formatDateStr(cell.date);
                const dayItems = getItemsForDate(dateStr);
                const isToday = dateStr === formatDateStr(new Date());

                return (
                  <div
                    key={idx}
                    onClick={() => handleOpenBookModal(dateStr, "10:00")}
                    style={{
                      minHeight: 68,
                      background: cell.isCurrentMonth ? (isToday ? "rgba(6, 182, 212, 0.08)" : "rgba(255,255,255,0.02)") : "rgba(255,255,255,0.005)",
                      border: isToday ? "1px solid var(--aura-cyan)" : "1px solid var(--border-card)",
                      borderRadius: 10,
                      padding: 6,
                      opacity: cell.isCurrentMonth ? 1 : 0.4,
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 800, color: isToday ? "var(--aura-cyan)" : "var(--color-text-2)" }}>
                      <span>{cell.date.getDate()}</span>
                      {dayItems.length > 0 && (
                        <span className="glass-pill" style={{ fontSize: 8, padding: "1px 5px", background: "var(--aura-cyan)", color: "#000", fontWeight: 900 }}>
                          {dayItems.length}
                        </span>
                      )}
                    </div>

                    <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 2 }}>
                      {dayItems.slice(0, 2).map(item => (
                        <div
                          key={item.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItem(item);
                          }}
                          style={{
                            background: item.item_type === 'availability_block' ? "rgba(16, 185, 129, 0.2)" : "rgba(6, 182, 212, 0.2)",
                            border: `1px solid ${item.item_type === 'availability_block' ? '#10b981' : 'var(--aura-cyan)'}`,
                            borderRadius: 4,
                            padding: "1px 4px",
                            fontSize: 9,
                            fontWeight: 700,
                            color: "#fff",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap"
                          }}
                        >
                          {formatTime12h(item.start_time)} - {item.title}
                        </div>
                      ))}
                      {dayItems.length > 2 && (
                        <div style={{ fontSize: 8, color: "var(--color-text-3)", textAlign: "center", marginTop: 1 }}>
                          +{dayItems.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* BOOKING MODAL */}
      {showBookModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20
        }}>
          <div style={{
            background: "#0f172a", border: "1px solid var(--border-card)",
            borderRadius: 24, padding: 28, width: "100%", maxWidth: 500,
            display: "flex", flexDirection: "column", gap: 20, animation: "fadeIn 0.2s ease-out"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 12 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                <Plus size={18} color="var(--aura-cyan)" /> Book Coaching Session / Slot
              </div>
              <button onClick={() => setShowBookModal(false)} style={{ background: "none", border: "none", color: "var(--color-text-3)", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            {modalError && (
              <div style={{
                background: "rgba(239, 68, 68, 0.1)", border: "1px solid #ef4444",
                borderRadius: 12, padding: "10px 14px", color: "#fca5a5", fontSize: 12,
                display: "flex", alignItems: "center", gap: 8
              }}>
                <AlertCircle size={16} /> {modalError}
              </div>
            )}

            <form onSubmit={handleBookSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Item Type Selector */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: "var(--color-text-3)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Slot Type</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setModalData(prev => ({ ...prev, item_type: 'session' }))}
                    style={{
                      background: modalData.item_type === 'session' ? "rgba(6, 182, 212, 0.2)" : "rgba(255,255,255,0.03)",
                      border: modalData.item_type === 'session' ? "1px solid var(--aura-cyan)" : "1px solid var(--border-card)",
                      color: modalData.item_type === 'session' ? "var(--aura-cyan)" : "var(--color-text-2)",
                      borderRadius: 10, padding: "8px 0", fontSize: 11, fontWeight: 800, cursor: "pointer"
                    }}
                  >
                    1-on-1 Session
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalData(prev => ({ ...prev, item_type: 'availability_block' }))}
                    style={{
                      background: modalData.item_type === 'availability_block' ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.03)",
                      border: modalData.item_type === 'availability_block' ? "1px solid #10b981" : "1px solid var(--border-card)",
                      color: modalData.item_type === 'availability_block' ? "#34d399" : "var(--color-text-2)",
                      borderRadius: 10, padding: "8px 0", fontSize: 11, fontWeight: 800, cursor: "pointer"
                    }}
                  >
                    Free Slot
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalData(prev => ({ ...prev, item_type: 'event' }))}
                    style={{
                      background: modalData.item_type === 'event' ? "rgba(139, 92, 246, 0.2)" : "rgba(255,255,255,0.03)",
                      border: modalData.item_type === 'event' ? "1px solid #8b5cf6" : "1px solid var(--border-card)",
                      color: modalData.item_type === 'event' ? "#c084fc" : "var(--color-text-2)",
                      borderRadius: 10, padding: "8px 0", fontSize: 11, fontWeight: 800, cursor: "pointer"
                    }}
                  >
                    Gym Event
                  </button>
                </div>
              </div>

              {/* Roster Athlete Dropdown (if session) */}
              {modalData.item_type === 'session' && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 800, color: "var(--color-text-3)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Select Athlete</label>
                  <select
                    value={modalData.athlete_id}
                    onChange={e => setModalData(prev => ({ ...prev, athlete_id: e.target.value }))}
                    style={{
                      width: "100%", background: "var(--color-surface-h)", border: "1px solid var(--border-card)",
                      borderRadius: 10, padding: "10px 12px", color: "#fff", fontSize: 13, outline: "none"
                    }}
                    required
                  >
                    {athletes.length === 0 ? (
                      <option value="">No active athletes on roster</option>
                    ) : (
                      athletes.map(a => (
                        <option key={a.athlete_id} value={a.athlete_id}>
                          {a.name || a.email}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}

              {/* Title / Description */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: "var(--color-text-3)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Title / Focus</label>
                <input
                  type="text"
                  placeholder={modalData.item_type === 'session' ? "e.g. Form Check & Heavy Squats" : "e.g. Open Office Hours"}
                  value={modalData.title}
                  onChange={e => setModalData(prev => ({ ...prev, title: e.target.value }))}
                  style={{
                    width: "100%", background: "var(--color-surface-h)", border: "1px solid var(--border-card)",
                    borderRadius: 10, padding: "10px 12px", color: "#fff", fontSize: 13, outline: "none", boxSizing: "border-box"
                  }}
                />
              </div>

              {/* Date & Time Row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 800, color: "var(--color-text-3)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Date</label>
                  <input
                    type="date"
                    value={modalData.date}
                    onChange={e => setModalData(prev => ({ ...prev, date: e.target.value }))}
                    style={{
                      width: "100%", background: "var(--color-surface-h)", border: "1px solid var(--border-card)",
                      borderRadius: 10, padding: "8px 10px", color: "#fff", fontSize: 12, outline: "none", boxSizing: "border-box"
                    }}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 800, color: "var(--color-text-3)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Start Time</label>
                  <input
                    type="time"
                    value={modalData.start_time}
                    onChange={e => handleStartTimeChange(e.target.value)}
                    style={{
                      width: "100%", background: "var(--color-surface-h)", border: "1px solid var(--border-card)",
                      borderRadius: 10, padding: "8px 10px", color: "#fff", fontSize: 12, outline: "none", boxSizing: "border-box"
                    }}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 800, color: "var(--color-text-3)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>End Time</label>
                  <input
                    type="time"
                    value={modalData.end_time}
                    onChange={e => handleEndTimeChange(e.target.value)}
                    style={{
                      width: "100%", background: "var(--color-surface-h)", border: "1px solid var(--border-card)",
                      borderRadius: 10, padding: "8px 10px", color: "#fff", fontSize: 12, outline: "none", boxSizing: "border-box"
                    }}
                    required
                  />
                </div>
              </div>

              {/* Quick Duration Preset Pills */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-3)", marginBottom: 6 }}>Quick Duration Presets:</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {[30, 45, 60, 90].map(dur => (
                    <button
                      key={dur}
                      type="button"
                      onClick={() => handleDurationPreset(dur)}
                      style={{
                        background: parseInt(modalData.duration) === dur ? "rgba(6, 182, 212, 0.2)" : "rgba(255,255,255,0.03)",
                        border: parseInt(modalData.duration) === dur ? "1px solid var(--aura-cyan)" : "1px solid var(--border-card)",
                        color: parseInt(modalData.duration) === dur ? "var(--aura-cyan)" : "var(--color-text-2)",
                        borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer"
                      }}
                    >
                      {dur}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Recurrence Selection */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 800, color: "var(--color-text-3)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Recurrence</label>
                  <select
                    value={modalData.recurrence_rule}
                    onChange={e => setModalData(prev => ({ ...prev, recurrence_rule: e.target.value }))}
                    style={{
                      width: "100%", background: "var(--color-surface-h)", border: "1px solid var(--border-card)",
                      borderRadius: 10, padding: "8px 10px", color: "#fff", fontSize: 12, outline: "none", boxSizing: "border-box"
                    }}
                  >
                    <option value="none">One-time Session</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                  </select>
                </div>
                {modalData.recurrence_rule !== 'none' && (
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 800, color: "var(--color-text-3)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Repeat Count</label>
                    <select
                      value={modalData.recurrence_count}
                      onChange={e => setModalData(prev => ({ ...prev, recurrence_count: e.target.value }))}
                      style={{
                        width: "100%", background: "var(--color-surface-h)", border: "1px solid var(--border-card)",
                        borderRadius: 10, padding: "8px 10px", color: "#fff", fontSize: 12, outline: "none", boxSizing: "border-box"
                      }}
                    >
                      <option value="4">4 weeks</option>
                      <option value="8">8 weeks</option>
                      <option value="12">12 weeks</option>
                    </select>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowBookModal(false)}
                  style={{
                    flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-card)",
                    borderRadius: 12, padding: "10px 0", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary"
                  style={{
                    flex: 1, padding: "10px 0", borderRadius: 12, fontSize: 13, fontWeight: 800, cursor: "pointer"
                  }}
                >
                  {submitting ? "Booking..." : "Confirm Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SESSION DETAIL ACTION POPOVER / MODAL */}
      {selectedItem && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20
        }}>
          <div style={{
            background: "#0f172a", border: "1px solid var(--border-card)",
            borderRadius: 24, padding: 28, width: "100%", maxWidth: 440,
            display: "flex", flexDirection: "column", gap: 20, animation: "fadeIn 0.2s ease-out"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 12 }}>
              <div>
                <span className="glass-pill" style={{ fontSize: 9, padding: "2px 8px", background: "rgba(6, 182, 212, 0.1)", color: "var(--aura-cyan)", border: "1px solid rgba(6, 182, 212, 0.2)", textTransform: "uppercase" }}>
                  {selectedItem.item_type?.replace('_', ' ')}
                </span>
                <h3 style={{ margin: "6px 0 0", fontSize: 18, fontWeight: 900, color: "#fff" }}>
                  {selectedItem.title}
                </h3>
              </div>
              <button onClick={() => setSelectedItem(null)} style={{ background: "none", border: "none", color: "var(--color-text-3)", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13, color: "var(--color-text-2)" }}>
              {selectedItem.athlete_name && (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Users size={16} color="var(--aura-cyan)" />
                  <span>Athlete: <strong style={{ color: "#fff" }}>{selectedItem.athlete_name}</strong></span>
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Clock size={16} color="var(--aura-cyan)" />
                <span>Time: <strong style={{ color: "#fff" }}>{formatTime12h(selectedItem.start_time)} - {formatTime12h(selectedItem.end_time)}</strong></span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <MapPin size={16} color="var(--aura-cyan)" />
                <span>Location: <strong style={{ color: "#fff" }}>{selectedItem.location || "Gym"}</strong></span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Info size={16} color="var(--aura-cyan)" />
                <span>Status: <strong style={{ color: selectedItem.status === 'completed' ? '#34d399' : '#38bdf8', textTransform: 'capitalize' }}>{selectedItem.status}</strong></span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
              {selectedItem.status !== 'completed' && (
                <button
                  onClick={() => handleUpdateStatus(selectedItem.id, 'completed')}
                  disabled={actionLoading}
                  style={{
                    background: "rgba(16, 185, 129, 0.15)", border: "1px solid #10b981",
                    borderRadius: 12, padding: "10px 0", color: "#34d399", fontWeight: 800, fontSize: 12,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer"
                  }}
                >
                  <Check size={14} /> Mark Session Completed
                </button>
              )}
              <button
                onClick={() => handleDeleteItem(selectedItem.id)}
                disabled={actionLoading}
                style={{
                  background: "rgba(239, 68, 68, 0.1)", border: "1px solid #ef4444",
                  borderRadius: 12, padding: "10px 0", color: "#fca5a5", fontWeight: 800, fontSize: 12,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer"
                }}
              >
                <Trash2 size={14} /> Cancel / Remove Slot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
