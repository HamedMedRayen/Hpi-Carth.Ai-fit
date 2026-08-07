import React, { useState, useEffect } from "react";
import { Trophy, Target, Calendar, Dumbbell, Zap, Flame, CheckCircle2, ChevronRight, Info, Search, Filter, XCircle, BarChart3, Clock, AlertCircle } from "lucide-react";
import { useTheme } from "../utils/theme";
import { api } from "../utils/api";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/common/Toast";

export default function Challenges() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState([]);
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [joining, setJoining] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [challengesData, activeData] = await Promise.all([
          api.getChallenges(),
          api.getActiveChallenge()
        ]);
        setChallenges(challengesData.challenges || []);
        if (activeData.active) {
          setActiveChallenge(activeData);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    };
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
      navigate("/"); // Redirect to home
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
      setActiveChallenge(null);
      // Refresh list
      const challengesData = await api.getChallenges();
      setChallenges(challengesData.challenges || []);
    } catch (err) {
      toast.error("Failed to cancel challenge");
    }
  };

  const filteredChallenges = challenges.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = activeFilter === "all" || c.type === activeFilter;
    const isNotActive = !activeChallenge || c.id !== activeChallenge.user_challenge.challenge_id;
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

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
      <div className="loader" />
    </div>
  );

  return (
    <div className="page-container" style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <Trophy size={32} color="var(--aura-accent)" />
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Fitness Challenges</h1>
        </div>
        <p style={{ color: 'var(--color-text-2)', fontSize: '1.1rem' }}>
          Push your limits and transform your body with our curated seasonal challenges.
        </p>
      </header>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: activeChallenge ? '450px 1fr' : '1fr', 
        gap: '2.5rem',
        alignItems: 'start'
      }}>
        
        {/* LEFT SIDE: Active Challenge Info (Only if active) */}
        {activeChallenge && (
          <div style={{ position: 'sticky', top: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={20} color="var(--aura-accent)" /> Active Challenge
            </h2>
            
            <div className="glass themed-card" style={{ borderRadius: '24px', overflow: 'hidden', border: '2px solid var(--aura-accent)' }}>
              <div style={{ 
                padding: '2rem', 
                background: `linear-gradient(135deg, ${getDifficultyColor(activeChallenge.challenge_details.difficulty)}22 0%, transparent 100%)`,
                borderBottom: '1px solid var(--color-border)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <span style={{ 
                    padding: '4px 12px', 
                    borderRadius: '20px', 
                    fontSize: '0.7rem', 
                    fontWeight: 800, 
                    textTransform: 'uppercase',
                    background: getDifficultyColor(activeChallenge.challenge_details.difficulty),
                    color: '#fff'
                  }}>
                    {activeChallenge.challenge_details.difficulty.replace('_', ' ')}
                  </span>
                  <button onClick={handleCancel} style={{ background: 'none', border: 'none', color: 'var(--color-text-3)', cursor: 'pointer' }} title="Cancel Challenge">
                    <XCircle size={20} />
                  </button>
                </div>
                
                <h3 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>{activeChallenge.challenge_details.name}</h3>
                <p style={{ color: 'var(--color-text-2)', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>{activeChallenge.challenge_details.description}</p>
              </div>

              <div style={{ padding: '2rem' }}>
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.9rem', fontWeight: 700 }}>
                    <span>Overall Progress</span>
                    <span style={{ color: 'var(--aura-accent)' }}>{Math.round((activeChallenge.user_challenge.progress_days.length / activeChallenge.challenge_details.duration_days) * 100)}%</span>
                  </div>
                  <div style={{ height: '10px', background: 'var(--color-bg-hover)', borderRadius: '5px', overflow: 'hidden' }}>
                    <div style={{ 
                      height: '100%', 
                      background: 'var(--aura-accent)', 
                      width: `${(activeChallenge.user_challenge.progress_days.length / activeChallenge.challenge_details.duration_days) * 100}%`,
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                  <div className="glass" style={{ padding: '1rem', borderRadius: '16px', textAlign: 'center' }}>
                    <BarChart3 size={20} style={{ margin: '0 auto 0.5rem', color: 'var(--aura-accent)' }} />
                    <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{activeChallenge.user_challenge.progress_days.length}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-3)', textTransform: 'uppercase', fontWeight: 700 }}>Days Completed</div>
                  </div>
                  <div className="glass" style={{ padding: '1rem', borderRadius: '16px', textAlign: 'center' }}>
                    <Clock size={20} style={{ margin: '0 auto 0.5rem', color: 'var(--aura-accent)' }} />
                    <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{activeChallenge.challenge_details.duration_days - activeChallenge.user_challenge.progress_days.length}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-3)', textTransform: 'uppercase', fontWeight: 700 }}>Days Left</div>
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: '1rem', letterSpacing: '0.05em' }}>Recent History</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {activeChallenge.user_challenge.progress_days.slice(-7).map((p, i) => (
                      <div key={i} className="glass" style={{ 
                        width: '32px', height: '32px', borderRadius: '8px', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)'
                      }}>
                        <CheckCircle2 size={16} />
                      </div>
                    ))}
                    {activeChallenge.user_challenge.progress_days.length === 0 && (
                      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-3)', fontStyle: 'italic' }}>No check-ins yet. Head to Dashboard!</div>
                    )}
                  </div>
                </div>

                <button 
                  onClick={() => navigate("/")}
                  className="btn-primary" 
                  style={{ width: '100%', padding: '1rem', borderRadius: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  Go to Check-in <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* RIGHT SIDE (or full width): Available Challenges */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
              {activeChallenge ? "Other Challenges" : "Available Challenges"}
            </h2>
            
            {!activeChallenge && (
              <div className="glass" style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 1rem', borderRadius: '12px', gap: '0.75rem', minWidth: '300px' }}>
                <Search size={18} color="var(--color-text-3)" />
                <input 
                  type="text" 
                  placeholder="Search challenges..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--color-text)', width: '100%', fontSize: '0.95rem' }}
                />
              </div>
            )}
          </div>

          {!activeChallenge && (
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
              {['all', 'strength', 'cardio', 'flexibility', 'nutrition', 'mixed'].map(filter => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className="glass"
                  style={{
                    padding: '0.6rem 1.25rem', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 600, textTransform: 'capitalize', cursor: 'pointer',
                    border: activeFilter === filter ? '2px solid var(--aura-accent)' : '2px solid transparent',
                    background: activeFilter === filter ? 'rgba(var(--aura-accent-rgb), 0.1)' : 'var(--bg-card)',
                    color: activeFilter === filter ? 'var(--aura-accent)' : 'var(--color-text-2)',
                    transition: 'all 0.2s ease', whiteSpace: 'nowrap'
                  }}
                >
                  {filter}
                </button>
              ))}
            </div>
          )}

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: activeChallenge ? 'repeat(auto-fill, minmax(320px, 1fr))' : 'repeat(auto-fill, minmax(380px, 1fr))', 
            gap: '1.5rem' 
          }}>
            {filteredChallenges.map((challenge) => (
              <div 
                key={challenge.id} 
                className="glass themed-card" 
                style={{ 
                  borderRadius: '24px', overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'transform 0.3s ease',
                  cursor: activeChallenge ? 'not-allowed' : 'pointer', opacity: activeChallenge ? 0.6 : 1
                }}
                onMouseEnter={(e) => !activeChallenge && (e.currentTarget.style.transform = 'translateY(-5px)')}
                onMouseLeave={(e) => !activeChallenge && (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <div style={{ 
                  height: '140px', background: `linear-gradient(135deg, ${getDifficultyColor(challenge.difficulty)}33 0%, var(--bg-sidebar) 100%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'
                }}>
                  <div style={{ 
                    width: '60px', height: '60px', borderRadius: '15px', background: 'var(--bg-card)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(0,0,0,0.1)', color: getDifficultyColor(challenge.difficulty)
                  }}>
                    {challenge.type === 'strength' ? <Dumbbell size={30} /> : 
                     challenge.type === 'cardio' ? <Flame size={30} /> :
                     challenge.type === 'nutrition' ? <Zap size={30} /> :
                     <Target size={30} />}
                  </div>
                  <span style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '2px 10px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase' }}>
                    {challenge.type}
                  </span>
                </div>

                <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>{challenge.name}</h3>
                  <p style={{ color: 'var(--color-text-2)', fontSize: '0.85rem', lineHeight: 1.5, margin: '0 0 1.5rem 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {challenge.description}
                  </p>

                  <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-3)' }}>
                      <Calendar size={14} /> {challenge.duration_days} Days
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-3)' }}>
                      <CheckCircle2 size={14} /> {challenge.days_per_week}x/Wk
                    </div>
                  </div>

                  <button 
                    disabled={!!activeChallenge || joining}
                    onClick={() => handleJoin(challenge.id)}
                    className="btn-primary"
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', fontWeight: 700, fontSize: '0.9rem', opacity: activeChallenge ? 0.5 : 1 }}
                  >
                    {activeChallenge ? "Locked" : joining ? "Joining..." : "Join Challenge"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {activeChallenge && filteredChallenges.length > 0 && (
            <div className="glass" style={{ marginTop: '2rem', padding: '1.5rem', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid var(--color-border)' }}>
              <AlertCircle size={24} color="var(--color-text-3)" />
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-2)' }}>
                You are currently in an active challenge. Complete or cancel it to unlock other challenges.
              </p>
            </div>
          )}

          {filteredChallenges.length === 0 && (
            <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
              <Search size={48} style={{ margin: '0 auto', opacity: 0.2, marginBottom: '1rem' }} />
              <p style={{ color: 'var(--color-text-3)' }}>No other challenges match your current filter.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
