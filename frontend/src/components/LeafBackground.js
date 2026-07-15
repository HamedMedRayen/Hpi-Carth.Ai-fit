import React from 'react';
import { useTheme } from '../utils/theme';

/**
 * Nature Theme Background
 * Features vibrant floating green leaves drifting across the screen.
 * Optimized for visibility on light backgrounds.
 */
export default function LeafBackground() {
  const { theme, previewTheme } = useTheme();
  const activeTheme = previewTheme || theme;

  if (activeTheme !== 'nature') return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: -1,
      overflow: 'hidden',
      pointerEvents: 'none',
      background: 'transparent'
    }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <path id="leaf-shape-nature" d="M10,0 C20,10 20,20 10,30 C0,20 0,10 10,0 Z" />
          <filter id="leaf-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.1" />
          </filter>
        </defs>
        {[...Array(20)].map((_, i) => {
          const scale = 0.6 + Math.random() * 1.4;
          const rotation = Math.random() * 360;
          return (
            <g key={i} style={{
              animation: `leaf-fall-nature ${20 + Math.random() * 15}s infinite linear`,
              animationDelay: `-${Math.random() * 20}s`,
            }}>
              <use
                href="#leaf-shape-nature"
                x={`${Math.random() * 100}%`}
                y="-100"
                transform={`rotate(${rotation}) scale(${scale})`}
                fill={i % 3 === 0 ? '#4A7C59' : i % 3 === 1 ? '#7FB069' : '#5D8A66'}
                opacity={0.5 + Math.random() * 0.3}
                filter="url(#leaf-shadow)"
              />
            </g>
          );
        })}
      </svg>

      <style>{`
        @keyframes leaf-fall-nature {
          0% { transform: translateY(-100px) translateX(0) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(110vh) translateX(120px) rotate(360deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
