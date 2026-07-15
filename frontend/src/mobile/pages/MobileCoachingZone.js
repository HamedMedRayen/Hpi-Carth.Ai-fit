import React, { useState, useEffect, useRef } from "react";
import { 
  Users, UserPlus, Check, X, Search, Activity, 
  ChevronRight, Dumbbell, Calendar, AlertCircle, 
  MessageSquare, Send, ArrowLeft, Plus, Trash2, Award
} from "lucide-react";
import { api } from "../../utils/api";
import { resolveBackendUrl } from "../../utils/config";
import { useToast } from "../../components/Toast";
import { fmt } from "../../utils/formatters";

export default function MobileCoachingZone() {
  const [role, setRole] = useState("athlete");
  const [activeTab, setActiveTab] = useState("my-coach"); // 'roster' | 'my-coach'
  const [athletes, setAthletes] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  // Invite states
  const [inviteIdentifier, setInviteIdentifier] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);

  // Selected Athlete states
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [athleteStats, setAthleteStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Sub-views inside selected athlete: 'stats' | 'chat' | 'suggest'
  const [athleteSubView, setAthleteSubView] = useState("stats");

  // Coach Chat states (for both coach chatting with athlete, or athlete chatting with coach)
  const [chattingWith, setChattingWith] = useState(null); // { id, name, avatar }
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const chatEndRef = useRef(null);

  // Suggest Workout states
  const [programName, setProgramName] = useState("");
  const [programNote, setProgramNote] = useState("");
  const [suggestWorkouts, setSuggestWorkouts] = useState([{ name: "Day 1", exercises: [] }]);
  const [activeSuggestDay, setActiveSuggestDay] = useState(0);
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState("");
  const [searchedExercises, setSearchedExercises] = useState([]);
  const [searchingExercises, setSearchingExercises] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [roleData, aths, cochs] = await Promise.all([
        api.getCoachRole().catch(() => ({ role: "athlete" })),
        api.getMyAthletes().catch(() => []),
        api.getMyCoach().catch(() => [])
      ]);
      
      const userRole = roleData?.role || "athlete";
      setRole(userRole);
      setAthletes(aths || []);
      setCoaches(cochs || []);

      if (userRole === "coach") {
        setActiveTab("roster");
      } else {
        setActiveTab("my-coach");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load coaching data");
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteIdentifier.trim()) return;
    setInviteLoading(true);
    try {
      const res = await api.inviteAthlete(inviteIdentifier);
      toast.success(res.message || "Invitation sent successfully!");
      setInviteIdentifier("");
      // Refresh roster
      const aths = await api.getMyAthletes().catch(() => []);
      setAthletes(aths || []);
    } catch (err) {
      toast.error(err.message || "Failed to send invitation");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleResponse = async (relationshipId, action) => {
    try {
      await api.respondInvite(relationshipId, action);
      toast.success(`Invitation ${action}ed successfully.`);
      fetchInitialData();
    } catch (e) {
      console.error(e);
      toast.error("Failed to respond to invitation");
    }
  };

  const loadAthleteStats = async (athlete) => {
    setSelectedAthlete(athlete);
    setAthleteSubView("stats");
    setLoadingStats(true);
    try {
      const stats = await api.getAthleteStats(athlete.athlete_id);
      setAthleteStats(stats);
    } catch (e) {
      console.error("Failed to load athlete stats", e);
      toast.error("Could not load athlete statistics");
      setAthleteStats(null);
    } finally {
      setLoadingStats(false);
    }
  };

  // ── Chat logic ──────────────────────────────────────────────────
  useEffect(() => {
    let interval;
    if (chattingWith) {
      fetchMessages();
      interval = setInterval(fetchMessages, 3000); // Poll every 3 seconds for new messages
    }
    return () => clearInterval(interval);
  }, [chattingWith]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async () => {
    if (!chattingWith) return;
    try {
      const chatHistory = await api.getMessages(chattingWith.id);
      setMessages(chatHistory || []);
    } catch (e) {
      console.error("Failed to load chat history", e);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !chattingWith) return;
    setSendingMessage(true);
    const text = newMessage;
    setNewMessage("");
    try {
      await api.sendMessage(chattingWith.id, text);
      fetchMessages();
    } catch (err) {
      toast.error("Failed to send message");
      setNewMessage(text); // Restore text
    } finally {
      setSendingMessage(false);
    }
  };

  // ── Suggest Workout logic ───────────────────────────────────────
  useEffect(() => {
    if (exerciseSearchQuery.trim().length > 1) {
      setSearchingExercises(true);
      const delayDebounce = setTimeout(async () => {
        try {
          const res = await api.getExercises({ search: exerciseSearchQuery, limit: 10 });
          setSearchedExercises(res.exercises || res || []);
        } catch (e) {
          console.error(e);
        } finally {
          setSearchingExercises(false);
        }
      }, 500);
      return () => clearTimeout(delayDebounce);
    } else {
      setSearchedExercises([]);
    }
  }, [exerciseSearchQuery]);

  const addSuggestWorkoutDay = () => {
    setSuggestWorkouts([
      ...suggestWorkouts, 
      { name: `Day ${suggestWorkouts.length + 1}`, exercises: [] }
    ]);
    setActiveSuggestDay(suggestWorkouts.length);
  };

  const removeSuggestWorkoutDay = (index) => {
    if (suggestWorkouts.length === 1) return;
    const nextDays = suggestWorkouts.filter((_, i) => i !== index);
    setSuggestWorkouts(nextDays);
    if (activeSuggestDay >= index && activeSuggestDay > 0) {
      setActiveSuggestDay(activeSuggestDay - 1);
    }
  };

  const addExerciseToSuggest = (ex) => {
    const nextDays = [...suggestWorkouts];
    nextDays[activeSuggestDay].exercises.push({
      id: ex.id,
      exercise_name: ex.name,
      sets: [{ reps: 10, weight_kg: 0 }]
    });
    setSuggestWorkouts(nextDays);
    setExerciseSearchQuery("");
    setSearchedExercises([]);
    toast.success(`${ex.name} added!`);
  };

  const removeExerciseFromSuggest = (exIndex) => {
    const nextDays = [...suggestWorkouts];
    nextDays[activeSuggestDay].exercises = nextDays[activeSuggestDay].exercises.filter((_, i) => i !== exIndex);
    setSuggestWorkouts(nextDays);
  };

  const addSetToSuggestExercise = (exIndex) => {
    const nextDays = [...suggestWorkouts];
    nextDays[activeSuggestDay].exercises[exIndex].sets.push({ reps: 10, weight_kg: 0 });
    setSuggestWorkouts(nextDays);
  };

  const removeSetFromSuggestExercise = (exIndex, setIndex) => {
    const nextDays = [...suggestWorkouts];
    const sets = nextDays[activeSuggestDay].exercises[exIndex].sets;
    if (sets.length === 1) return;
    nextDays[activeSuggestDay].exercises[exIndex].sets = sets.filter((_, i) => i !== setIndex);
    setSuggestWorkouts(nextDays);
  };

  const updateSuggestSet = (exIndex, setIndex, field, val) => {
    const nextDays = [...suggestWorkouts];
    nextDays[activeSuggestDay].exercises[exIndex].sets[setIndex][field] = parseFloat(val) || 0;
    setSuggestWorkouts(nextDays);
  };

  const submitSuggestedProgram = async () => {
    if (!programName.trim()) {
      toast.error("Please enter a Program Name");
      return;
    }
    const isValid = suggestWorkouts.every(w => w.name.trim() && w.exercises.length > 0);
    if (!isValid) {
      toast.error("Every workout day needs a name and at least one exercise.");
      return;
    }

    setSuggestLoading(true);
    try {
      await api.suggestWorkout(selectedAthlete.athlete_id, {
        program_name: programName,
        program_note: programNote,
        workouts: suggestWorkouts
      });
      toast.success(`Program suggested to ${selectedAthlete.name}!`);
      // Reset suggest states
      setProgramName("");
      setProgramNote("");
      setSuggestWorkouts([{ name: "Day 1", exercises: [] }]);
      setActiveSuggestDay(0);
      setAthleteSubView("stats");
    } catch (err) {
      toast.error(err.message || "Failed to suggest program");
    } finally {
      setSuggestLoading(false);
    }
  };

  // ── Render Helpers ──────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <div className="loader" style={{ width: 40, height: 40, border: "4px solid rgba(255,255,255,0.1)", borderTop: "4px solid var(--aura-cyan)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  // Live Chat Sub-view (re-used for both Coach-Athlete and Athlete-Coach)
  if (chattingWith) {
    return (
      <div className="mobile-page" style={{ paddingBottom: 0, height: "100vh", display: "flex", flexDirection: "column", background: "var(--color-bg)" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
          <button 
            onClick={() => setChattingWith(null)}
            style={{ background: "none", border: "none", color: "var(--color-text)", cursor: "pointer", display: "flex", alignItems: "center", padding: 4 }}
          >
            <ArrowLeft size={22} />
          </button>
          
          <div style={{ 
            width: 36, height: 36, borderRadius: 12, background: "var(--color-surface-h)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 800, color: "var(--aura-cyan)", overflow: "hidden"
          }}>
            {chattingWith.avatar ? (
              <img src={resolveBackendUrl(chattingWith.avatar)} alt={chattingWith.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              chattingWith.name.charAt(0).toUpperCase()
            )}
          </div>
          
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--color-text)", margin: 0 }}>{chattingWith.name}</h2>
            <span style={{ fontSize: 11, color: "var(--aura-cyan)", fontWeight: 700 }}>Direct Chat</span>
          </div>
        </div>

        {/* Messages list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 0", display: "flex", flexDirection: "column", gap: 12 }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-secondary)", fontSize: 13, fontStyle: "italic", margin: "auto" }}>
              No messages yet. Send a note to start the conversation!
            </div>
          ) : (
            messages.map((m, i) => {
              const isMe = m.sender_id === api.token?.userId() || m.sender_id === undefined; // fallback
              return (
                <div 
                  key={i} 
                  style={{ 
                    alignSelf: isMe ? "flex-end" : "flex-start",
                    maxWidth: "75%",
                    background: isMe ? "var(--aura-cyan)" : "rgba(255,255,255,0.06)",
                    color: isMe ? "#000" : "#fff",
                    padding: "10px 14px",
                    borderRadius: isMe ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                    fontSize: 13,
                    lineHeight: 1.4,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
                  }}
                >
                  <div>{m.message}</div>
                  <div style={{ 
                    fontSize: 9, 
                    color: isMe ? "rgba(0,0,0,0.4)" : "var(--text-secondary)", 
                    textAlign: "right", 
                    marginTop: 4,
                    fontWeight: 700
                  }}>
                    {new Date(m.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <form 
          onSubmit={handleSendMessage}
          style={{ 
            display: "flex", 
            gap: 8, 
            padding: "12px 0 24px", 
            borderTop: "1px solid rgba(255,255,255,0.06)",
            background: "var(--color-bg)",
            flexShrink: 0
          }}
        >
          <input 
            type="text" 
            placeholder="Type a message..."
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            style={{ 
              flex: 1, 
              background: "var(--color-surface-h)", 
              border: "1px solid var(--color-border)",
              borderRadius: 12, 
              padding: "12px 16px", 
              color: "var(--color-text)", 
              fontSize: 14,
              outline: "none"
            }}
          />
          <button 
            type="submit"
            disabled={!newMessage.trim() || sendingMessage}
            style={{ 
              width: 48, 
              height: 48, 
              borderRadius: 12, 
              background: "var(--aura-cyan)", 
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--color-bg)"
            }}
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    );
  }

  // Detailed Athlete Profile view for coaches
  if (selectedAthlete) {
    return (
      <div className="mobile-page" style={{ paddingBottom: 100 }}>
        {/* Header Navigation */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 0", marginBottom: 16 }}>
          <button 
            onClick={() => setSelectedAthlete(null)}
            style={{ background: "var(--color-surface)", border: "none", color: "var(--color-text)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 10 }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--color-text)", margin: 0 }}>{selectedAthlete.name}</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 12, margin: 0 }}>Athlete profile & analytics</p>
          </div>
        </div>

        {/* Mini Tab selector */}
        <div style={{ display: "flex", gap: 6, background: "var(--color-surface)", padding: 4, borderRadius: 12, marginBottom: 20 }}>
          {["stats", "chat", "suggest"].map(sub => (
            <button
              key={sub}
              onClick={() => {
                if (sub === "chat") {
                  setChattingWith({
                    id: selectedAthlete.athlete_id,
                    name: selectedAthlete.name,
                    avatar: selectedAthlete.avatar_url
                  });
                } else {
                  setAthleteSubView(sub);
                }
              }}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: 9,
                border: "none",
                background: athleteSubView === sub ? "var(--aura-cyan)" : "transparent",
                color: athleteSubView === sub ? "#000" : "var(--text-secondary)",
                fontWeight: 700,
                fontSize: 12,
                textTransform: "capitalize",
                transition: "all 0.2s"
              }}
            >
              {sub === "suggest" ? "Suggest" : sub}
            </button>
          ))}
        </div>

        {/* Sub-view: Workout Suggestion */}
        {athleteSubView === "suggest" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="mobile-card" style={{ padding: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 16px", color: "var(--aura-cyan)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Suggest Training Program
              </h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "var(--text-secondary)", marginBottom: 6 }}>PROGRAM NAME</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Muscle Gain Push-Pull" 
                    value={programName}
                    onChange={e => setProgramName(e.target.value)}
                    style={{ width: "100%", background: "var(--color-surface-h)", border: "1px solid var(--color-border)", borderRadius: 10, padding: 12, color: "var(--color-text)", fontSize: 14 }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "var(--text-secondary)", marginBottom: 6 }}>PROGRAM NOTE / ADVICE</label>
                  <textarea 
                    placeholder="Provide recommendations, load parameters, rest times..."
                    value={programNote}
                    onChange={e => setProgramNote(e.target.value)}
                    style={{ width: "100%", background: "var(--color-surface-h)", border: "1px solid var(--color-border)", borderRadius: 10, padding: 12, color: "var(--color-text)", fontSize: 13, minHeight: 60, resize: "none" }}
                  />
                </div>
              </div>
            </div>

            {/* Workout Days Selector Bar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "var(--color-text)" }}>Workout Days</span>
              <button 
                onClick={addSuggestWorkoutDay}
                style={{ background: "rgba(var(--aura-cyan-rgb), 0.1)", border: "none", color: "var(--aura-cyan)", padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}
              >
                <Plus size={12} /> Add Day
              </button>
            </div>

            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
              {suggestWorkouts.map((w, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveSuggestDay(idx)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 10,
                    border: "none",
                    background: activeSuggestDay === idx ? "rgba(var(--aura-cyan-rgb), 0.15)" : "rgba(255,255,255,0.03)",
                    border: activeSuggestDay === idx ? "1px solid var(--aura-cyan)" : "1px solid transparent",
                    color: activeSuggestDay === idx ? "var(--aura-cyan)" : "var(--text-secondary)",
                    fontWeight: 700,
                    fontSize: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    whiteSpace: "nowrap"
                  }}
                >
                  {w.name}
                  {suggestWorkouts.length > 1 && (
                    <span 
                      onClick={(e) => { e.stopPropagation(); removeSuggestWorkoutDay(idx); }}
                      style={{ color: "#EF4444", fontSize: 14, padding: "0 2px" }}
                    >
                      ×
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Exercises inside Day */}
            <div className="mobile-card" style={{ padding: 16 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "var(--text-secondary)", marginBottom: 6 }}>DAY NAME</label>
                <input 
                  type="text" 
                  value={suggestWorkouts[activeSuggestDay].name}
                  onChange={e => {
                    const nextDays = [...suggestWorkouts];
                    nextDays[activeSuggestDay].name = e.target.value;
                    setSuggestWorkouts(nextDays);
                  }}
                  placeholder="e.g. Lower Body"
                  style={{ width: "100%", background: "var(--color-surface-h)", border: "1px solid var(--color-border)", borderRadius: 10, padding: 10, color: "var(--color-text)", fontSize: 14 }}
                />
              </div>

              {/* Add Exercise Search Input */}
              <div style={{ marginBottom: 16, position: "relative" }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "var(--text-secondary)", marginBottom: 6 }}>ADD EXERCISE</label>
                <div style={{ display: "flex", alignItems: "center", background: "var(--color-surface-h)", border: "1px solid var(--color-border)", borderRadius: 10, padding: "0 10px" }}>
                  <Search size={14} color="var(--text-secondary)" style={{ marginRight: 8 }} />
                  <input 
                    type="text" 
                    placeholder="Search exercise..." 
                    value={exerciseSearchQuery}
                    onChange={e => setExerciseSearchQuery(e.target.value)}
                    style={{ flex: 1, border: "none", background: "none", color: "var(--color-text)", height: 38, fontSize: 13, outline: "none" }}
                  />
                </div>

                {searchedExercises.length > 0 && (
                  <div style={{ 
                    position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10,
                    background: "rgba(20,22,26,0.98)", border: "1px solid var(--color-border)", borderRadius: 10,
                    maxHeight: 180, overflowY: "auto", marginTop: 4, boxShadow: "0 8px 24px rgba(0,0,0,0.5)"
                  }}>
                    {searchedExercises.map(ex => (
                      <div 
                        key={ex.id}
                        onClick={() => addExerciseToSuggest(ex)}
                        style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 13, color: "var(--color-text)", cursor: "pointer" }}
                      >
                        {ex.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Active Exercises List */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {suggestWorkouts[activeSuggestDay].exercises.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 24, border: "1.5px dashed rgba(255,255,255,0.05)", borderRadius: 10, color: "var(--text-secondary)", fontSize: 12 }}>
                    No exercises added to this day yet. Use search above to add!
                  </div>
                ) : (
                  suggestWorkouts[activeSuggestDay].exercises.map((ex, exIdx) => (
                    <div key={exIdx} style={{ background: "var(--color-surface)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "var(--color-text)" }}>{ex.exercise_name}</span>
                        <button 
                          onClick={() => removeExerciseFromSuggest(exIdx)}
                          style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer" }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {ex.sets.map((set, setIdx) => (
                          <div key={setIdx} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", width: 20 }}>S{setIdx + 1}</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-secondary)" }}>REPS</span>
                              <input 
                                type="number" 
                                value={set.reps}
                                onChange={e => updateSuggestSet(exIdx, setIdx, "reps", e.target.value)}
                                style={{ width: 44, background: "var(--color-surface-h)", border: "1px solid var(--color-border)", borderRadius: 6, padding: "2px 4px", color: "var(--color-text)", fontSize: 11, textAlign: "center" }}
                              />
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-secondary)" }}>KG</span>
                              <input 
                                type="number" 
                                value={set.weight_kg}
                                onChange={e => updateSuggestSet(exIdx, setIdx, "weight_kg", e.target.value)}
                                style={{ width: 50, background: "var(--color-surface-h)", border: "1px solid var(--color-border)", borderRadius: 6, padding: "2px 4px", color: "var(--color-text)", fontSize: 11, textAlign: "center" }}
                              />
                            </div>
                            {ex.sets.length > 1 && (
                              <button 
                                onClick={() => removeSetFromSuggestExercise(exIdx, setIdx)}
                                style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: 11 }}
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <button 
                        onClick={() => addSetToSuggestExercise(exIdx)}
                        style={{ background: "none", border: "none", color: "var(--aura-cyan)", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 2, marginTop: 8 }}
                      >
                        <Plus size={10} /> Add Set
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <button
              onClick={submitSuggestedProgram}
              disabled={suggestLoading || !programName.trim()}
              style={{
                width: "100%", background: "var(--aura-cyan)", color: "var(--color-bg)", border: "none", borderRadius: 12, padding: 15, fontWeight: 800, fontSize: 14, cursor: "pointer"
              }}
            >
              {suggestLoading ? "Suggesting Program..." : "Send Program to Athlete"}
            </button>
          </div>
        )}

        {/* Sub-view: Stats Dashboard */}
        {athleteSubView === "stats" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Athlete Bio Card */}
            <div className="mobile-card" style={{ padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ 
                width: 48, height: 48, borderRadius: 12, background: "var(--color-surface-h)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, fontWeight: 800, color: "var(--aura-cyan)", overflow: "hidden"
              }}>
                {selectedAthlete.avatar_url ? (
                  <img src={resolveBackendUrl(selectedAthlete.avatar_url)} alt={selectedAthlete.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  selectedAthlete.name.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--color-text)", margin: 0 }}>{selectedAthlete.name}</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: 11, margin: "2px 0 0" }}>{selectedAthlete.email}</p>
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, background: "var(--color-surface-h)", color: "var(--color-text)", padding: "2px 6px", borderRadius: 6 }}>
                    {selectedAthlete.experience?.toUpperCase()}
                  </span>
                  {selectedAthlete.bodyweight > 0 && (
                    <span style={{ fontSize: 9, fontWeight: 700, background: "var(--color-surface-h)", color: "var(--color-text)", padding: "2px 6px", borderRadius: 6 }}>
                      {selectedAthlete.bodyweight} KG
                    </span>
                  )}
                </div>
              </div>
            </div>

            {loadingStats ? (
              <div style={{ textAlign: "center", padding: 40, color: "var(--text-secondary)" }}>Loading stats...</div>
            ) : athleteStats ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Stats Panel */}
                <div className="mobile-card" style={{ padding: 16 }}>
                  <h4 style={{ fontSize: 11, fontWeight: 800, color: "var(--aura-cyan)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <Activity size={14} /> Training Summary
                  </h4>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.04)", paddingBottom: 6 }}>
                      <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Total Sessions</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)" }}>{athleteStats.workout_summary?.total_sessions || 0}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.04)", paddingBottom: 6 }}>
                      <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Total Volume</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)" }}>{fmt.tonnes(athleteStats.set_summary?.total_volume || 0)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Avg Session Duration</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)" }}>{Math.round((athleteStats.workout_summary?.avg_duration_sec || 0)/60)} min</span>
                    </div>
                  </div>
                </div>

                {/* Wellness Card */}
                <div className="mobile-card" style={{ padding: 16 }}>
                  <h4 style={{ fontSize: 11, fontWeight: 800, color: "var(--aura-cyan)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <AlertCircle size={14} /> Wellness & Fatigue
                  </h4>

                  {athleteStats.latest_fatigue ? (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>Fatigue Score</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: athleteStats.latest_fatigue.level === 'high' ? '#EF4444' : 'var(--aura-cyan)' }}>
                        {athleteStats.latest_fatigue.raw_score}% <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>({athleteStats.latest_fatigue.label})</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>No fatigue reports submitted recently.</div>
                  )}

                  {athleteStats.active_injuries?.length > 0 ? (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: "#EF4444", marginBottom: 6 }}>ACTIVE INJURIES</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {athleteStats.active_injuries.map((inj, i) => (
                          <div key={i} style={{ fontSize: 12, color: "var(--color-text)" }}>• {inj.body_part} ({inj.severity})</div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: "#22C55E", fontWeight: 700 }}>No active injuries reported.</div>
                  )}
                </div>

                {/* Workouts Card */}
                <div className="mobile-card" style={{ padding: 16 }}>
                  <h4 style={{ fontSize: 11, fontWeight: 800, color: "var(--aura-cyan)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <Calendar size={14} /> Recent Workouts
                  </h4>

                  {athleteStats.recent_workouts?.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {athleteStats.recent_workouts.slice(0, 3).map(w => (
                        <div key={w.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 6, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)" }}>{w.workout_name}</div>
                            <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{new Date(w.session_date).toLocaleDateString()}</div>
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--aura-cyan)" }}>{fmt.int(w.volume)} kg</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>No logged workouts found.</div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: 24, color: "var(--text-secondary)", fontSize: 13 }}>No stats available for this athlete.</div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Main Page Layout ────────────────────────────────────────────
  return (
    <div className="mobile-page" style={{ paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ padding: "16px 0", marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px", color: "var(--color-text)", letterSpacing: "-0.02em" }}>Coaching Zone</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: 0 }}>Roster management, training suggestions, and client interactions.</p>
      </div>

      {/* Role-Based Tab Switcher */}
      <div style={{ display: "flex", gap: 6, background: "var(--color-surface)", padding: 4, borderRadius: 14, marginBottom: 20 }}>
        {role === 'coach' && (
          <button 
            onClick={() => setActiveTab("roster")} 
            style={{
              flex: 1, padding: "10px 0", borderRadius: 10, border: "none",
              background: activeTab === "roster" ? "var(--aura-cyan)" : "transparent",
              color: activeTab === "roster" ? "#000" : "var(--text-secondary)",
              fontWeight: 700, fontSize: 12, transition: "all 0.2s"
            }}
          >
            Athlete Roster
          </button>
        )}
        <button 
          onClick={() => setActiveTab("my-coach")} 
          style={{
            flex: 1, padding: "10px 0", borderRadius: 10, border: "none",
            background: activeTab === "my-coach" ? "var(--aura-cyan)" : "transparent",
            color: activeTab === "my-coach" ? "#000" : "var(--text-secondary)",
            fontWeight: 700, fontSize: 12, transition: "all 0.2s"
          }}
        >
          My Coach
        </button>
      </div>

      {/* TAB 1: ATHLETE ROSTER (Coach Role Only) */}
      {activeTab === "roster" && role === 'coach' && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Invite Section */}
          <div className="mobile-card" style={{ padding: 16 }}>
            <h3 style={{ fontSize: 12, fontWeight: 800, color: "var(--aura-cyan)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <UserPlus size={14} /> Invite Athlete
            </h3>
            <form onSubmit={handleInvite} style={{ display: "flex", gap: 10 }}>
              <input 
                type="text"
                placeholder="Athlete's email or nickname"
                value={inviteIdentifier}
                onChange={e => setInviteIdentifier(e.target.value)}
                style={{
                  flex: 1, background: "var(--color-surface-h)", border: "1px solid var(--color-border)",
                  borderRadius: 10, padding: "10px 14px", color: "var(--color-text)", fontSize: 13, outline: "none"
                }}
                required
              />
              <button 
                type="submit" 
                disabled={inviteLoading}
                style={{
                  background: "var(--aura-cyan)", color: "var(--color-bg)", border: "none", 
                  borderRadius: 10, padding: "0 16px", fontWeight: 800, fontSize: 13, cursor: "pointer"
                }}
              >
                {inviteLoading ? "..." : "Invite"}
              </button>
            </form>
          </div>

          {/* Athletes List */}
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <Users size={16} color="var(--text-secondary)" /> Active Athletes ({athletes.length})
            </h3>

            {athletes.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, border: "1.5px dashed rgba(255,255,255,0.05)", borderRadius: 16, color: "var(--text-secondary)" }}>
                <Users size={32} style={{ opacity: 0.2, marginBottom: 8, margin: "0 auto" }} />
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text)" }}>No Athletes Assigned</div>
                <p style={{ fontSize: 12, margin: "4px 0 0" }}>Invite an athlete above to start coaching.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {athletes.map(a => (
                  <div 
                    key={a.relationship_id}
                    onClick={() => a.status === 'active' && loadAthleteStats(a)}
                    className="mobile-card"
                    style={{ 
                      padding: 14, 
                      display: "flex", 
                      flexDirection: "column", 
                      gap: 12,
                      cursor: a.status === 'active' ? "pointer" : "default"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ 
                        width: 38, height: 38, borderRadius: 10, background: "var(--color-surface-h)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 14, fontWeight: 800, color: "var(--color-text)", overflow: "hidden"
                      }}>
                        {a.avatar_url ? (
                          <img src={resolveBackendUrl(a.avatar_url)} alt={a.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          a.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "var(--color-text)" }}>{a.name}</div>
                        <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{a.email}</div>
                      </div>

                      {a.status === 'active' && <ChevronRight size={18} color="var(--text-secondary)" />}
                    </div>

                    {a.status === 'pending' ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(245,158,11,0.08)", color: "#f59e0b", padding: "6px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700 }}>
                        <AlertCircle size={12} /> Invitation Pending
                      </div>
                    ) : (
                      <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 10, fontSize: 11 }}>
                        <div style={{ display: "flex", gap: 16 }}>
                          <div>
                            <span style={{ color: "var(--text-secondary)", fontWeight: 700, marginRight: 4 }}>Sessions:</span>
                            <span style={{ color: "var(--color-text)", fontWeight: 800 }}>{a.total_sessions}</span>
                          </div>
                          <div>
                            <span style={{ color: "var(--text-secondary)", fontWeight: 700, marginRight: 4 }}>Last Active:</span>
                            <span style={{ color: "var(--color-text)", fontWeight: 800 }}>
                              {a.last_session ? new Date(a.last_session).toLocaleDateString([], { day: 'numeric', month: 'short' }) : "Never"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MY COACH (Athlete View or Coach View Coach Assigned) */}
      {activeTab === "my-coach" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <Users size={16} color="var(--text-secondary)" /> Your Assigned Coach
          </h3>

          {coaches.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, border: "1.5px dashed rgba(255,255,255,0.05)", borderRadius: 16, color: "var(--text-secondary)" }}>
              <Users size={32} style={{ opacity: 0.2, marginBottom: 8, margin: "0 auto" }} />
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text)" }}>No Coach Linked</div>
              <p style={{ fontSize: 12, margin: "4px 0 0" }}>When a coach invites you, it will appear here.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {coaches.map(c => (
                <div key={c.relationship_id} className="mobile-card" style={{ padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                    <div style={{ 
                      width: 44, height: 44, borderRadius: 12, background: "var(--color-surface-h)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 16, fontWeight: 800, color: "var(--aura-cyan)", overflow: "hidden"
                    }}>
                      {c.coach_avatar ? (
                        <img src={resolveBackendUrl(c.coach_avatar)} alt={c.coach_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        c.coach_name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: "var(--color-text)" }}>{c.coach_name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{c.coach_email}</div>
                    </div>
                  </div>

                  {c.status === 'pending' ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button 
                        onClick={() => handleResponse(c.relationship_id, 'accept')} 
                        style={{ flex: 1, background: "var(--aura-cyan)", color: "var(--color-bg)", border: "none", borderRadius: 10, padding: "10px 0", fontWeight: 800, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
                      >
                        <Check size={14} /> Accept
                      </button>
                      <button 
                        onClick={() => handleResponse(c.relationship_id, 'decline')} 
                        style={{ flex: 1, background: "var(--color-surface-h)", color: "var(--color-text)", border: "1px solid var(--color-border)", borderRadius: 10, padding: "10px 0", fontWeight: 800, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
                      >
                        <X size={14} /> Decline
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 8, borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 12 }}>
                      <button 
                        onClick={() => setChattingWith({
                          id: c.coach_id,
                          name: c.coach_name,
                          avatar: c.coach_avatar
                        })}
                        style={{ flex: 1, background: "var(--aura-cyan)", color: "var(--color-bg)", border: "none", borderRadius: 10, padding: "10px 0", fontWeight: 800, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                      >
                        <MessageSquare size={14} /> Chat with Coach
                      </button>
                      <div style={{ flex: 1, background: "rgba(34,197,94,0.08)", color: "#22c55e", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontSize: 12, fontWeight: 700 }}>
                        <Check size={14} /> Active Coach
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
