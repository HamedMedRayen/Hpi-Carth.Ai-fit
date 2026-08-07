import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { TrendingUp } from 'lucide-react';

/**
 * ProgressiveOverloadSuggestion - Shows suggestions if last RPE <= 7
 */
export default function ProgressiveOverloadSuggestion({ exerciseName }) {
  const [lastSet, setLastSet] = useState(null);
  const [showSuggestion, setShowSuggestion] = useState(false);

  useEffect(() => {
    if (!exerciseName) return;
    api.getLastSet(exerciseName)
      .then(data => {
        setLastSet(data);
        if (data && data.rpe && data.rpe <= 7) {
          setShowSuggestion(true);
        } else {
          setShowSuggestion(false);
        }
      })
      .catch(() => setShowSuggestion(false));
  }, [exerciseName]);

  if (!showSuggestion || !lastSet) return null;

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.1), rgba(251, 146, 60, 0.05))',
      border: '1px solid rgba(251, 146, 60, 0.2)',
      borderRadius: 8,
      padding: '10px 12px',
      marginBottom: 8,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontSize: 12,
      color: '#fb923c'
    }}>
      <TrendingUp size={16} strokeWidth={1.8} color="#fb923c" style={{ flexShrink: 0 }} />
      <span style={{ flex: 1 }}>
        Last set easy (RPE {lastSet.rpe}) — <strong>increase weight or reps</strong> for better gains
      </span>
    </div>
  );
}
