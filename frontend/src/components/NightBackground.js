import React from 'react';
import { useTheme } from '../utils/theme';

/**
 * Night Theme Background
 * Features twinkling stars in a deep indigo sky.
 */
export default function NightBackground() {
  const { theme, previewTheme } = useTheme();
  const activeTheme = previewTheme || theme;

  if (activeTheme !== 'dark') return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: -1,
      overflow: 'hidden',
      pointerEvents: 'none',
      background: 'linear-gradient(to bottom, #020617 0%, #0f172a 100%)'
    }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        <filter id="star-glow">
          <feGaussianBlur stdDeviation="1.5" result="glow" />
          <feMerge>
            <feMergeNode in="glow" /><feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {[...Array(80)].map((_, i) => (
          <circle
            key={i}
            cx={`${Math.random() * 100}%`}
            cy={`${Math.random() * 100}%`}
            r={Math.random() * 1.2 + 0.3}
            fill="#fff"
            filter="url(#star-glow)"
            style={{
              animation: `twinkle ${2 + Math.random() * 4}s infinite ease-in-out`,
              animationDelay: `-${Math.random() * 5}s`,
              opacity: 0.2 + Math.random() * 0.8
            }}
          />
        ))}
      </svg>

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
