import React, { useState, useEffect } from "react";
import { CheckCircle2, ChevronRight, Trophy, Flame, Calendar, Dumbbell, Zap, Target } from "lucide-react";
import { api } from "../../utils/api";
import { useNavigate } from "react-router-dom";
import { useToast } from "../Toast";

export default function ChallengeCheckinWidget() {
  const navigate = useNavigate();
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const toast = useToast();

  const fetchActive = async () => {
    try {
      const res = await api.getActiveChallenge();
      if (res.active) {
        setActiveChallenge(res);
      } else {
        setActiveChallenge(null);
      }
    } catch (err) {
      console.error("Failed to fetch active challenge:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActive();
  }, []);

  const handleCheckin = async () => {
    if (!activeChallenge || checkingIn) return;
    
    // Find next day to check in
    const progress = activeChallenge.user_challenge.progress_days || [];
    const nextDay = progress.length + 1;
    
    setCheckingIn(true);
    try {
      const res = await api.checkinChallenge(nextDay);
      if (res.status === "success" || res.status === "challenge_completed") {
        await fetchActive();
        if (res.status === "challenge_completed") {
          toast.success("Congratulations! You've finished the challenge! 🏆");
        }
      }
    } catch (err) {
      toast.error("Check-in failed");
    } finally {
      setCheckingIn(false);
    }
  };

  if (loading) return <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="loader" /></div>;
  if (!activeChallenge) return null;

  const { challenge_details, user_challenge } = activeChallenge;
  const progress = user_challenge.progress_days || [];
  const nextDay = progress.length + 1;
  const isFinished = progress.length >= challenge_details.duration_days;
  
  // Find task for today
  const dayData = challenge_details.days.find(d => d.day === nextDay);

  return (
    <div className="glass" style={{ 
      padding: '24px', 
      borderRadius: '24px', 
      border: '2px solid var(--aura-accent)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--aura-accent)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>
            <Zap size={14} /> Active Challenge Check-in
          </div>
          <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>{challenge_details.name}</h3>
        </div>
        <div style={{ 
          width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(var(--aura-accent-rgb), 0.1)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--aura-accent)'
        }}>
          {challenge_details.type === 'strength' ? <Dumbbell size={24} /> : 
           challenge_details.type === 'cardio' ? <Flame size={24} /> : <Trophy size={24} />}
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--color-text-3)', fontWeight: 600 }}>Progress</span>
          <span style={{ color: 'var(--aura-accent)', fontWeight: 800 }}>{progress.length} / {challenge_details.duration_days} Days</span>
        </div>
        <div style={{ height: '8px', background: 'var(--color-bg-hover)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ 
            height: '100%', background: 'var(--aura-accent)', 
            width: `${(progress.length / challenge_details.duration_days) * 100}%`,
            transition: 'width 0.5s ease'
          }} />
        </div>
      </div>

      {dayData && !isFinished && (
        <div className="glass" style={{ padding: '1.5rem', borderRadius: '16px', marginBottom: '1.5rem', background: 'rgba(var(--aura-accent-rgb), 0.02)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-3)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            Day {nextDay}: {dayData.type === 'active' ? (dayData.task?.focus || dayData.task?.activity || 'Active Session') : 'Rest & Recover'}
          </div>
          
          {dayData.type === 'active' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {dayData.task?.exercises ? dayData.task.exercises.map((ex, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--aura-accent)' }} />
                  <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{ex.name}</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-3)', marginLeft: 'auto' }}>
                    {ex.sets} × {ex.reps}
                  </span>
                </div>
              )) : (
                <div style={{ color: 'var(--color-text-2)', fontSize: '0.95rem' }}>
                  {dayData.task?.structure && <div style={{ marginBottom: '0.5rem', fontWeight: 600, color: 'var(--color-text-1)' }}>{dayData.task.structure}</div>}
                  {dayData.task?.duration_minutes && <div><Calendar size={14} style={{ display: 'inline', marginRight: '4px' }} /> {dayData.task.duration_minutes} minutes</div>}
                  {dayData.task?.intensity && <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--aura-accent)' }}>Intensity: {dayData.task.intensity}</div>}
                  {dayData.task?.description && <div style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>{dayData.task.description}</div>}
                </div>
              )}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--color-text-2)', fontStyle: 'italic' }}>
              {dayData.task.description}
            </p>
          )}
        </div>
      )}

      <button 
        disabled={checkingIn || isFinished}
        onClick={handleCheckin}
        className="btn-primary" 
        style={{ width: '100%', padding: '1rem', borderRadius: '14px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}
      >
        {checkingIn ? 'Checking in...' : isFinished ? 'Challenge Complete!' : 'Complete Daily Task'}
        {!checkingIn && !isFinished && <CheckCircle2 size={20} />}
      </button>

      <button 
        onClick={() => navigate("/challenges")}
        style={{ 
          marginTop: '1rem', width: '100%', background: 'none', border: 'none', 
          color: 'var(--color-text-3)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
        }}
      >
        View Challenge Details <ChevronRight size={14} />
      </button>
    </div>
  );
}
