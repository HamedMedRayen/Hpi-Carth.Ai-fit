import React, { useState, useEffect } from "react";
import { 
  Trophy, Target, Calendar, Dumbbell, Zap, Flame, 
  CheckCircle2, ChevronRight, Search, XCircle, 
  BarChart3, Clock, AlertCircle, Heart 
} from "lucide-react";
import { api } from "../../utils/api";
import { useToast } from "../../components/common/Toast";

export default function MobileChallenges() {
  const [challenges, setChallenges] = useState([]);
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [joining, setJoining] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const toast = useToast();
  const isLocked = !!activeChallenge;

  const fetchData = async () => {
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Request timed out. Check connection.")), 5000)
      );

      const fetchPromise = Promise.all([
        api.getChallenges(),
        api.getActiveChallenge()
      ]);

      const [challengesData, activeData] = await Promise.race([
        fetchPromise,
        timeoutPromise
      ]);

      setChallenges(challengesData?.challenges || []);
      if (activeData?.active) {
        setActiveChallenge(activeData);
      } else {
        setActiveChallenge(null);
      }
    } catch (err) {
      console.error("Failed to fetch challenges:", err);
      if (toast && toast.error) {
        toast.error("Failed to load challenges: " + (err.message || "Network Error"));
      }
      setChallenges([]);
      setActiveChallenge(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleJoin = async (challengeId) => {
    if (activeChallenge) {
      toast.info("You already have an active challenge. Cancel or complete it first.");
      return;
    }
    setJoining(true);
    try {
      await api.joinChallenge(challengeId);
      toast.success("Successfully joined the challenge! Let's crush it!");
      fetchData(); // Refresh to show active challenge
    } catch (err) {
      toast.error(err.message || "Failed to join challenge");
    } finally {
      setJoining(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm("Are you sure you want to cancel this challenge? Your progress will be lost.")) return;
    try {
      await api.cancelChallenge();
      toast.info("Challenge cancelled.");
      setActiveChallenge(null);
      fetchData();
    } catch (err) {
      toast.error("Failed to cancel challenge");
    }
  };

  const handleCheckin = async () => {
    if (!activeChallenge) return;
    setCheckingIn(true);
    try {
      const progressDays = activeChallenge.user_challenge.progress_days || [];
      const nextDayIndex = progressDays.length + 1;
      
      if (nextDayIndex > (activeChallenge?.challenge_details?.duration_days || 30)) {
        toast.info("You have completed all days of this challenge! 🎉");
        return;
      }

      await api.checkinChallenge(nextDayIndex);
      toast.success(`Day ${nextDayIndex} checked in! Keep going! 🔥`);
      fetchData();
    } catch (err) {
      toast.error(err.message || "Failed to check in");
    } finally {
      setCheckingIn(false);
    }
  };

  const filteredChallenges = challenges.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = activeFilter === "all" || c.type === activeFilter;
    const isNotActive = !activeChallenge || c.id !== activeChallenge?.user_challenge?.challenge_id;
    return matchesSearch && matchesFilter && isNotActive;
  });

  const getDifficultyColor = (diff) => {
    switch (diff) {
      case 'beginner': return '#10b981';
      case 'easy_beginner': return '#34d399';
      case 'intermediate': return '#f59e0b';
      case 'advanced': return '#ef4444';
      case 'elite': return '#7c3aed';
      default: return 'var(--aura-accent)';
    }
  };

  const getCategoryIcon = (type, size = 20) => {
    switch (type) {
      case 'strength': return <Dumbbell size={size} />;
      case 'cardio': return <Flame size={size} />;
      case 'nutrition': return <Zap size={size} />;
      case 'flexibility': return <Heart size={size} />;
      default: return <Target size={size} />;
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <div className="loader" style={{ width: 40, height: 40, border: "4px solid rgba(255,255,255,0.1)", borderTop: "4px solid var(--aura-accent)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="mobile-page" style={{ paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ padding: "16px 0", marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <Trophy size={28} color="var(--aura-accent)" />
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: "var(--color-text)", letterSpacing: "-0.02em" }}>Challenges</h1>
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: 0 }}>Push your limits, achieve training consistency, and earn rewards.</p>
      </div>

      {/* Active Challenge Section (if exists) */}
      {activeChallenge && (
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <Zap size={16} color="var(--aura-accent)" /> Active Challenge
          </h2>
          
          <div className="mobile-card" style={{ 
            padding: 20, 
            background: `linear-gradient(135deg, ${getDifficultyColor(activeChallenge?.challenge_details?.difficulty)}22 0%, var(--color-surface) 100%)`, 
            border: `1.5px solid ${getDifficultyColor(activeChallenge?.challenge_details?.difficulty || 'beginner')}55`
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <span style={{ 
                fontSize: 10, 
                fontWeight: 800, 
                background: getDifficultyColor(activeChallenge?.challenge_details?.difficulty || 'beginner'), 
                color: "var(--color-bg)", 
                padding: "3px 8px", 
                borderRadius: 6,
                textTransform: 'uppercase'
              }}>
                {activeChallenge?.challenge_details?.difficulty?.replace('_', ' ') || ''}
              </span>
              <button 
                onClick={handleCancel} 
                style={{ background: "var(--color-surface-h)", border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: "4px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700 }}
              >
                <XCircle size={14} /> Leave
              </button>
            </div>
            
            <h3 style={{ fontSize: 19, fontWeight: 800, color: "var(--color-text)", margin: "0 0 6px" }}>
              {activeChallenge?.challenge_details?.name}
            </h3>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 16px", lineHeight: 1.4 }}>
              {activeChallenge?.challenge_details?.description}
            </p>

            {/* Progress */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, fontWeight: 700 }}>
                <span style={{ color: "var(--text-secondary)" }}>Progress</span>
                <span style={{ color: 'var(--aura-accent)' }}>
                  {Math.round(((activeChallenge.user_challenge.progress_days || []).length / (activeChallenge?.challenge_details?.duration_days || 30)) * 100)}%
                </span>
              </div>
              <div style={{ height: 6, background: "var(--color-surface-h)", borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ 
                  height: '100%', 
                  background: 'var(--aura-accent)', 
                  width: `${Math.min(100, ((activeChallenge.user_challenge.progress_days || []).length / (activeChallenge?.challenge_details?.duration_days || 30)) * 100)}%`,
                  transition: 'width 0.5s ease'
                }} />
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", padding: 10, borderRadius: 10, textAlign: 'center' }}>
                <BarChart3 size={16} style={{ margin: '0 auto 4px', color: 'var(--aura-accent)' }} />
                <div style={{ fontSize: 15, fontWeight: 800, color: "var(--color-text)" }}>{(activeChallenge.user_challenge.progress_days || []).length}</div>
                <div style={{ fontSize: 9, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Days Completed</div>
              </div>
              <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", padding: 10, borderRadius: 10, textAlign: 'center' }}>
                <Clock size={16} style={{ margin: '0 auto 4px', color: 'var(--aura-accent)' }} />
                <div style={{ fontSize: 15, fontWeight: 800, color: "var(--color-text)" }}>
                  {Math.max(0, (activeChallenge?.challenge_details?.duration_days || 30) - (activeChallenge.user_challenge.progress_days || []).length)}
                </div>
                <div style={{ fontSize: 9, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Days Left</div>
              </div>
            </div>

            {/* Check-ins History */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8, letterSpacing: '0.05em' }}>Recent Check-ins</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(activeChallenge.user_challenge.progress_days || []).map((p, i) => (
                  <div key={i} style={{ 
                    width: 28, height: 28, borderRadius: 6, 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.25)'
                  }}>
                    <CheckCircle2 size={14} />
                  </div>
                ))}
                {(activeChallenge.user_challenge.progress_days || []).length === 0 && (
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontStyle: 'italic' }}>No check-ins yet. Tap the button below to log!</div>
                )}
              </div>
            </div>

            <button 
              onClick={handleCheckin}
              disabled={checkingIn}
              style={{ 
                width: '100%', 
                padding: 13, 
                borderRadius: 10, 
                background: "var(--aura-accent)", 
                color: "var(--color-bg)",
                border: "none",
                fontWeight: 800, 
                fontSize: 13,
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: 6,
                cursor: 'pointer'
              }}
            >
              {checkingIn ? "Checking in..." : <><CheckCircle2 size={16} /> Mark Today Completed</>}
            </button>
          </div>
        </div>
      )}

      {/* Available Challenges Section */}
      <div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text)", margin: 0 }}>
            {activeChallenge ? "Other Challenges" : "Discover Challenges"}
          </h2>
          
          {/* Search bar */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            background: "var(--color-surface-h)", 
            border: "1px solid var(--color-border)",
            padding: "10px 14px", 
            borderRadius: 12, 
            gap: 10
          }}>
            <Search size={16} color="var(--text-secondary)" />
            <input 
              type="text" 
              placeholder="Search challenges..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ background: 'none', border: 'none', outline: 'none', color: "var(--color-text)", width: '100%', fontSize: 14 }}
            />
          </div>

          {/* Category Filter Horizontal Scroll */}
          <div style={{ 
            display: 'flex', 
            gap: 8, 
            overflowX: 'auto', 
            paddingBottom: 4,
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}>
            {['all', 'strength', 'cardio', 'flexibility', 'nutrition', 'mixed'].map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                style={{
                  padding: '6px 14px', 
                  borderRadius: 20, 
                  fontSize: 12, 
                  fontWeight: 700, 
                  textTransform: 'capitalize', 
                  cursor: 'pointer',
                  border: '1.5px solid transparent',
                  background: activeFilter === filter ? 'var(--aura-accent)' : 'var(--color-surface-h)',
                  color: activeFilter === filter ? '#000' : 'var(--color-text-2)',
                  transition: 'all 0.2s', 
                  whiteSpace: 'nowrap'
                }}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* List of Challenges */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filteredChallenges.map((challenge) => {
            return (
              <div 
                key={challenge.id} 
                className="mobile-card" 
                style={{ 
                  borderRadius: 16, 
                  overflow: 'hidden', 
                  display: 'flex', 
                  flexDirection: 'column',
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                  opacity: isLocked ? 0.6 : 1
                }}
              >
                {/* Visual Header */}
                <div style={{ 
                  height: 100, 
                  background: `linear-gradient(135deg, ${getDifficultyColor(challenge.difficulty)}22 0%, var(--color-surface) 100%)`,
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: "0 16px", 
                  position: 'relative',
                  borderBottom: "1px solid var(--color-border)"
                }}>
                  <div style={{ 
                    width: 44, 
                    height: 44, 
                    borderRadius: 10, 
                    background: "var(--color-surface-h)",
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: getDifficultyColor(challenge.difficulty)
                  }}>
                    {getCategoryIcon(challenge.type, 22)}
                  </div>
                  
                  <div style={{ marginLeft: 12 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--color-text)", margin: "0 0 2px 0" }}>{challenge.name}</h3>
                    <span style={{ fontSize: 10, color: getDifficultyColor(challenge.difficulty), fontWeight: 700, textTransform: 'uppercase' }}>
                      {challenge.difficulty.replace('_', ' ')}
                    </span>
                  </div>

                  <span style={{ 
                    position: 'absolute', 
                    top: 12, 
                    right: 12, 
                    background: "var(--color-surface-h)", 
                    color: 'var(--text-secondary)', 
                    padding: '2px 8px', 
                    borderRadius: 6, 
                    fontSize: 9, 
                    fontWeight: 800, 
                    textTransform: 'uppercase' 
                  }}>
                    {challenge.type}
                  </span>
                </div>

                {/* Body Content */}
                <div style={{ padding: 16 }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.4, margin: '0 0 14px 0' }}>
                    {challenge.description}
                  </p>

                  <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>
                      <Calendar size={13} color="var(--aura-accent)" /> {challenge.duration_days} Days
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>
                      <CheckCircle2 size={13} color="var(--aura-accent)" /> {challenge.days_per_week}x/Wk
                    </div>
                  </div>

                  <button 
                    disabled={isLocked || joining}
                    onClick={() => handleJoin(challenge.id)}
                    style={{ 
                      width: '100%', 
                      padding: 12, 
                      borderRadius: 10, 
                      background: isLocked ? "var(--color-surface-h)" : "var(--aura-accent)",
                      color: isLocked ? "var(--color-text-3)" : "#000",
                      border: "none",
                      fontWeight: 800, 
                      fontSize: 13,
                      cursor: isLocked ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4
                    }}
                  >
                    {isLocked ? "Locked" : joining ? "Joining..." : <>Join Challenge <ChevronRight size={14} /></>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {isLocked && filteredChallenges.length > 0 && (
          <div className="mobile-card" style={{ marginTop: 20, padding: 14, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
            <AlertCircle size={20} color="#f59e0b" style={{ flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: 11, color: '#f59e0b', fontWeight: 600, lineHeight: 1.3 }}>
              You are currently active in a challenge. Complete or cancel it to unlock other challenges.
            </p>
          </div>
        )}

        {filteredChallenges.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 16px' }}>
            <Search size={36} style={{ margin: '0 auto 8px', opacity: 0.15, color: "var(--color-text)" }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>No other challenges match your selection.</p>
          </div>
        )}
      </div>
    </div>
  );
}
