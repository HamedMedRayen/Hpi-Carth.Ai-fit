import React, { useState, useEffect } from "react";
import { CheckCircle2, ChevronRight, Trophy, Flame, Dumbbell, Zap } from "lucide-react";
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
      if (res && res.active) {
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

  if (loading) return null;
  if (!activeChallenge) return null;

  const { challenge_details, user_challenge } = activeChallenge;
  const progress = user_challenge.progress_days || [];
  const nextDay = progress.length + 1;
  const isFinished = progress.length >= challenge_details.duration_days;
  const dayData = challenge_details.days ? challenge_details.days.find(d => d.day === nextDay) : null;
  const pct = Math.min(100, Math.round((progress.length / challenge_details.duration_days) * 100));

  return (
    <div className="right-card" style={{ 
      padding: '14px 16px', 
      borderRadius: '16px', 
      border: '1px solid color-mix(in srgb, var(--aura-accent) 30%, transparent)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Top compact row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ 
            width: 28, height: 28, borderRadius: 8, background: 'rgba(var(--aura-accent-rgb), 0.12)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--aura-accent)',
            flexShrink: 0
          }}>
            {challenge_details.type === 'strength' ? <Dumbbell size={15} /> : 
             challenge_details.type === 'cardio' ? <Flame size={15} /> : <Trophy size={15} />}
          </div>
          <div>
            <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--aura-accent)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Challenge Check-in
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.2 }}>
              {challenge_details.name}
            </div>
          </div>
        </div>

        <button 
          onClick={() => navigate("/challenges")}
          style={{ 
            background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, 
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 
          }}
        >
          Details <ChevronRight size={12} />
        </button>
      </div>

      {/* Progress Bar & Day task row */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600 }}>
          <span>Day {nextDay > challenge_details.duration_days ? challenge_details.duration_days : nextDay} of {challenge_details.duration_days}</span>
          <span style={{ color: 'var(--aura-accent)', fontWeight: 700 }}>{progress.length} / {challenge_details.duration_days} ({pct}%)</span>
        </div>

        <div style={{ height: 5, background: 'var(--color-bg-hover)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ 
            height: '100%', background: 'var(--aura-accent)', 
            width: `${pct}%`, transition: 'width 0.4s ease'
          }} />
        </div>

        {dayData && !isFinished && (
          <div style={{ 
            padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', 
            border: '1px solid var(--border-card)', fontSize: 11, color: 'var(--color-text-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '75%' }}>
              Today: {dayData.type === 'active' ? (dayData.task?.focus || dayData.task?.activity || 'Active Session') : 'Rest & Recover'}
            </span>
            {dayData.task?.duration_minutes && (
              <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>{dayData.task.duration_minutes}m</span>
            )}
          </div>
        )}
      </div>

      {/* Complete Button */}
      <button 
        disabled={checkingIn || isFinished}
        onClick={handleCheckin}
        className="btn-primary" 
        style={{ 
          width: '100%', padding: '8px 12px', borderRadius: 10, fontWeight: 700, 
          fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 
        }}
      >
        {checkingIn ? 'Checking in...' : isFinished ? 'Challenge Complete! 🏆' : 'Complete Daily Task'}
        {!checkingIn && !isFinished && <CheckCircle2 size={15} />}
      </button>
    </div>
  );
}
