import React, { useState, useEffect } from "react";
import { Users, UserPlus, Check, X, Search, Activity, ChevronRight, Dumbbell, TrendingUp, Calendar, AlertCircle, MessageSquare } from "lucide-react";
import Header from "../components/layout/Header";
import { api } from "../utils/api";
import { fmt } from "../utils/formatters";
import SuggestWorkoutModal from "../components/SuggestWorkoutModal";
import CoachChatModal from "../components/CoachChatModal";
import { useAuth } from "../utils/auth";

export default function CoachDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("roster"); // 'roster' | 'my-coach'
  const [athletes, setAthletes] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("athlete");

  // Invite state
  const [inviteIdentifier, setInviteIdentifier] = useState("");
  const [inviteStatus, setInviteStatus] = useState(null);

  // Selected Athlete State
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [athleteStats, setAthleteStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [chatRecipient, setChatRecipient] = useState(null);

  useEffect(() => {
    fetchData();
    api.getCoachRole().then(res => {
      setRole(res?.role || "athlete");
      if (res?.role === "coach") setActiveTab("roster");
      else setActiveTab("my-coach");
    });
  }, []);

  const fetchData = async () => {
    try {
      const [aths, cochs] = await Promise.all([
        api.getMyAthletes().catch(() => []),
        api.getMyCoach().catch(() => [])
      ]);
      setAthletes(aths || []);
      setCoaches(cochs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteIdentifier.trim()) return;

    try {
      const res = await api.inviteAthlete(inviteIdentifier);
      setInviteStatus({ type: "success", msg: res.message || `Invite sent` });
      setInviteIdentifier("");
      fetchData();
    } catch (e) {
      setInviteStatus({ type: "error", msg: e.message || "Failed to invite" });
    }

    setTimeout(() => setInviteStatus(null), 3000);
  };

  const handleResponse = async (relationshipId, action) => {
    try {
      await api.respondInvite(relationshipId, action);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const loadAthleteStats = async (athlete) => {
    setSelectedAthlete(athlete);
    setLoadingStats(true);
    try {
      const stats = await api.getAthleteStats(athlete.athlete_id);
      setAthleteStats(stats);
    } catch (e) {
      console.error("Failed to load athlete stats", e);
      setAthleteStats(null);
    } finally {
      setLoadingStats(false);
    }
  };

  const renderAthleteDetail = () => {
    if (!selectedAthlete) return null;

    return (
      <div style={{
        background: "var(--bg-glass)", borderRadius: 24, border: "1px solid var(--border-card)",
        padding: 24, display: "flex", flexDirection: "column", gap: 24,
        animation: "fadeIn 0.3s ease-out"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ 
              width: 64, height: 64, borderRadius: 20, background: "var(--bg-card)",
              border: "2px solid var(--aura-accent)", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 24, fontWeight: 800, color: "var(--aura-accent)", overflow: "hidden"
            }}>
              {selectedAthlete.avatar_url ? (
                <img src={selectedAthlete.avatar_url} alt={selectedAthlete.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                selectedAthlete.name.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "var(--color-text)" }}>{selectedAthlete.name}</h2>
              <div style={{ fontSize: 13, color: "var(--color-text-3)", marginTop: 4 }}>{selectedAthlete.email}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <span className="glass-pill" style={{ fontSize: 10, padding: "2px 8px" }}>{selectedAthlete.experience?.toUpperCase()}</span>
                {selectedAthlete.bodyweight > 0 && <span className="glass-pill" style={{ fontSize: 10, padding: "2px 8px" }}>{selectedAthlete.bodyweight} KG</span>}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button 
              onClick={() => setShowSuggestModal(true)}
              className="btn-primary" 
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 12, fontSize: 13, fontWeight: 700 }}
            >
              <Dumbbell size={16} /> Suggest Workout
            </button>
            <button 
              onClick={() => setChatRecipient({ ...selectedAthlete, id: selectedAthlete.athlete_id })}
              className="btn-secondary" 
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 12, fontSize: 13, fontWeight: 700 }}
            >
              <MessageSquare size={16} /> Chat
            </button>
            <button 
              onClick={() => setSelectedAthlete(null)}
              style={{ background: "rgba(255,255,255,0.05)", border: "none", color: "var(--color-text)", padding: "8px 16px", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              Back to Roster
            </button>
          </div>
        </div>

        {loadingStats ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-3)" }}>Loading stats...</div>
        ) : athleteStats ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-card)", borderRadius: 16, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--aura-accent)", marginBottom: 12 }}>
                <Activity size={18} /> <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.05em" }}>TRAINING SUMMARY</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: "var(--color-text-3)" }}>Total Sessions</span>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{athleteStats.workout_summary?.total_sessions || 0}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: "var(--color-text-3)" }}>Total Volume</span>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{fmt.tonnes(athleteStats.set_summary?.total_volume || 0)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "var(--color-text-3)" }}>Avg Session</span>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{Math.round((athleteStats.workout_summary?.avg_duration_sec || 0)/60)} min</span>
              </div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-card)", borderRadius: 16, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--aura-accent2)", marginBottom: 12 }}>
                <Calendar size={18} /> <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.05em" }}>RECENT WORKOUTS</span>
              </div>
              {athleteStats.recent_workouts?.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {athleteStats.recent_workouts.slice(0, 3).map(w => (
                    <div key={w.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{w.workout_name}</div>
                        <div style={{ fontSize: 11, color: "var(--color-text-3)" }}>{new Date(w.session_date).toLocaleDateString()}</div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{fmt.int(w.volume)} kg</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: "var(--color-text-3)" }}>No recent workouts.</div>
              )}
            </div>

            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-card)", borderRadius: 16, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--aura-accent3)", marginBottom: 12 }}>
                <AlertCircle size={18} /> <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.05em" }}>WELLNESS & FATIGUE</span>
              </div>
              {athleteStats.latest_fatigue ? (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, color: "var(--color-text-3)", marginBottom: 4 }}>Latest Fatigue Score</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: athleteStats.latest_fatigue.level === 'high' ? '#EF4444' : 'var(--aura-accent3)' }}>
                    {athleteStats.latest_fatigue.raw_score}% <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-3)", textTransform: "uppercase" }}>({athleteStats.latest_fatigue.label})</span>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: "var(--color-text-3)", marginBottom: 16 }}>No fatigue data logged.</div>
              )}

              {athleteStats.active_injuries?.length > 0 ? (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#EF4444", marginBottom: 4 }}>ACTIVE INJURIES</div>
                  {athleteStats.active_injuries.map((inj, i) => (
                    <div key={i} style={{ fontSize: 13 }}>• {inj.body_part} ({inj.severity})</div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: "#22C55E", fontWeight: 600 }}>No active injuries reported.</div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-3)" }}>No stats available for this athlete.</div>
        )}

      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 100, background: "var(--color-bg)" }}>
      <Header title="Coach Zone" subtitle="Athlete management & analytics" />

      <div className="page-inner" style={{ maxWidth: 1000, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Tab Selector */}
        <div style={{ display: "flex", gap: 8, background: "var(--bg-card)", padding: 6, borderRadius: 16, border: "1px solid var(--border-card)", width: "fit-content" }}>
          {role === 'coach' && (
            <button onClick={() => { setActiveTab("roster"); setSelectedAthlete(null); }} style={{
              background: activeTab === "roster" ? "var(--aura-accent)" : "transparent",
              color: activeTab === "roster" ? "#000" : "var(--color-text)",
              border: "none", padding: "8px 24px", borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all 0.2s"
            }}>
              Athlete Roster
            </button>
          )}
          <button onClick={() => { setActiveTab("my-coach"); setSelectedAthlete(null); }} style={{
            background: activeTab === "my-coach" ? "var(--aura-accent)" : "transparent",
            color: activeTab === "my-coach" ? "#000" : "var(--color-text)",
            border: "none", padding: "8px 24px", borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all 0.2s"
          }}>
            My Coach
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", color: "var(--color-text-3)", padding: 40 }}>Loading...</div>
        ) : activeTab === "roster" ? (
          selectedAthlete ? renderAthleteDetail() : (
            <>
              {/* Invite Section */}
              <div style={{ background: "var(--bg-glass)", padding: 24, borderRadius: 24, border: "1px solid var(--border-card)" }}>
                <h2 style={{ fontSize: 14, fontWeight: 800, display: "flex", alignItems: "center", gap: 8, marginBottom: 16, color: "var(--color-text)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  <UserPlus size={18} color="var(--aura-accent)" /> Invite Athlete
                </h2>
                <form onSubmit={handleInvite} style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
                    <Search size={16} color="var(--color-text-3)" style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)" }} />
                    <input
                      type="text"
                      className="themed-input"
                      value={inviteIdentifier}
                      onChange={e => setInviteIdentifier(e.target.value)}
                      placeholder="Athlete's email or nickname"
                      style={{ width: "100%", paddingLeft: 40, height: 48, borderRadius: 14 }}
                      required
                    />
                  </div>
                  <button type="submit" className="btn-primary" style={{ padding: "0 32px", borderRadius: 14, fontWeight: 700, height: 48 }}>
                    Send Invite
                  </button>
                </form>
                {inviteStatus && (
                  <div style={{
                    marginTop: 16, fontSize: 13, padding: "12px 16px", borderRadius: 12, fontWeight: 600,
                    background: inviteStatus.type === "error" ? "rgba(239, 68, 68, 0.1)" : "rgba(34, 197, 94, 0.1)",
                    color: inviteStatus.type === "error" ? "#EF4444" : "#22C55E",
                    border: `1px solid ${inviteStatus.type === "error" ? "rgba(239, 68, 68, 0.2)" : "rgba(34, 197, 94, 0.2)"}`
                  }}>
                    {inviteStatus.msg}
                  </div>
                )}
              </div>

              {/* Athlete List */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <h2 style={{ fontSize: 14, fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: 8, color: "var(--color-text)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  <Users size={18} color="var(--color-text-3)" /> Active Athletes ({athletes.length})
                </h2>
                
                {athletes.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 60, background: "rgba(255,255,255,0.02)", borderRadius: 24, border: "1px dashed var(--border-card)", color: "var(--color-text-3)" }}>
                    <div style={{ background: "rgba(255,255,255,0.05)", width: 64, height: 64, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                      <Users size={32} opacity={0.5} />
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text)", marginBottom: 4 }}>No Athletes Yet</div>
                    <div style={{ fontSize: 14 }}>Send an invite above to start coaching.</div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
                    {athletes.map(a => (
                      <div 
                        key={a.relationship_id} 
                        onClick={() => a.status === 'active' && loadAthleteStats(a)}
                        style={{ 
                          background: "var(--bg-glass)", border: "1px solid var(--border-card)", borderRadius: 20, 
                          padding: 20, cursor: a.status === 'active' ? "pointer" : "default",
                          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                          position: "relative", overflow: "hidden"
                        }}
                        onMouseEnter={e => {
                          if(a.status === 'active') {
                            e.currentTarget.style.transform = "translateY(-4px)";
                            e.currentTarget.style.borderColor = "var(--aura-accent)";
                          }
                        }}
                        onMouseLeave={e => {
                          if(a.status === 'active') {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.borderColor = "var(--border-card)";
                          }
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                          <div style={{ 
                            width: 48, height: 48, borderRadius: 16, background: "var(--bg-card)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 18, fontWeight: 800, color: "var(--color-text)", overflow: "hidden"
                          }}>
                            {a.avatar_url ? (
                              <img src={a.avatar_url} alt={a.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              a.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 16, color: "var(--color-text)" }}>{a.name}</div>
                            <div style={{ fontSize: 12, color: "var(--color-text-3)", marginTop: 2 }}>{a.email}</div>
                          </div>
                        </div>

                        {a.status === 'pending' ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(234, 179, 8, 0.1)", color: "#EAB308", padding: "8px 12px", borderRadius: 10, fontSize: 12, fontWeight: 700 }}>
                            <AlertCircle size={14} /> Invite Pending
                          </div>
                        ) : (
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 16 }}>
                            <div style={{ display: "flex", gap: 24 }}>
                              <div>
                                <div style={{ fontSize: 10, color: "var(--color-text-3)", fontWeight: 800, marginBottom: 2 }}>SESSIONS</div>
                                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--color-text)" }}>{a.total_sessions}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 10, color: "var(--color-text-3)", fontWeight: 800, marginBottom: 2 }}>LAST ACTIVE</div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text)" }}>{a.last_session ? new Date(a.last_session).toLocaleDateString() : "Never"}</div>
                              </div>
                            </div>
                            <ChevronRight size={20} color="var(--color-text-3)" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <h2 style={{ fontSize: 14, fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: 8, color: "var(--color-text)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
              <Users size={18} color="var(--color-text-3)" /> Your Coach
            </h2>
            
            {coaches.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60, background: "rgba(255,255,255,0.02)", borderRadius: 24, border: "1px dashed var(--border-card)", color: "var(--color-text-3)" }}>
                <div style={{ background: "rgba(255,255,255,0.05)", width: 64, height: 64, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <Users size={32} opacity={0.5} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text)", marginBottom: 4 }}>No Coach Assigned</div>
                <div style={{ fontSize: 14 }}>When a coach invites you, it will appear here.</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {coaches.map(c => (
                  <div key={c.relationship_id} style={{ 
                    background: "var(--bg-glass)", border: "1px solid var(--border-card)", borderRadius: 20, 
                    padding: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{ 
                        width: 56, height: 56, borderRadius: 16, background: "var(--bg-card)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 20, fontWeight: 800, color: "var(--aura-accent)", overflow: "hidden"
                      }}>
                        {c.coach_avatar ? (
                          <img src={c.coach_avatar} alt={c.coach_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          c.coach_name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 18, color: "var(--color-text)" }}>{c.coach_name}</div>
                        <div style={{ fontSize: 13, color: "var(--color-text-3)", marginTop: 2 }}>{c.coach_email}</div>
                      </div>
                    </div>

                    {c.status === 'pending' ? (
                      <div style={{ display: "flex", gap: 12 }}>
                        <button onClick={() => handleResponse(c.relationship_id, 'accept')} className="btn-primary" style={{
                          display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 12, fontWeight: 700, fontSize: 13
                        }}>
                          <Check size={16} /> Accept
                        </button>
                        <button onClick={() => handleResponse(c.relationship_id, 'decline')} style={{
                          display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 12,
                          background: "transparent", color: "var(--color-text)", border: "1px solid var(--border-card)", fontWeight: 700, fontSize: 13, cursor: "pointer"
                        }}>
                          <X size={16} /> Decline
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <button 
                          onClick={() => setChatRecipient({ ...c, id: c.coach_id, name: c.coach_name, avatar_url: c.coach_avatar })}
                          className="btn-secondary" 
                          style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 12, fontSize: 13, fontWeight: 700 }}
                        >
                          <MessageSquare size={16} /> Chat
                        </button>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(34, 197, 94, 0.1)", color: "#22C55E", padding: "8px 16px", borderRadius: 12, fontSize: 13, fontWeight: 700 }}>
                          <Check size={16} /> Active Coach
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

      {showSuggestModal && selectedAthlete && (
        <SuggestWorkoutModal 
          athlete={selectedAthlete} 
          onClose={() => setShowSuggestModal(false)}
          onSuggest={() => {
            setShowSuggestModal(false);
          }}
        />
      )}

      {chatRecipient && (
        <CoachChatModal 
          recipient={chatRecipient} 
          onClose={() => setChatRecipient(null)} 
        />
      )}
    </div>
  );
}
