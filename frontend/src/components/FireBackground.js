import React from 'react';
import { useTheme } from '../utils/theme';

/**
 * Premium "Fitmaker" Dark Background
 * Features deep charcoal base with massive, soft glowing orbs in vibrant red/orange.
 * Includes "Small Animated Smokes" that drift upwards for added atmosphere.
 */
export default function FireBackground() {
  const { theme, previewTheme } = useTheme();
  const activeTheme = previewTheme || theme;

  if (activeTheme !== 'fire') return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: -1,
      overflow: 'hidden',
      background: '#050505',
      pointerEvents: 'none'
    }}>
      {/* Primary Glowing Orbs */}
      <div style={{
        position: 'absolute',
        top: '15%',
        right: '-10%',
        width: '60vw',
        height: '60vw',
        background: 'radial-gradient(circle, rgba(255, 30, 0, 0.18) 0%, transparent 70%)',
        filter: 'blur(100px)',
        borderRadius: '50%',
        animation: 'pulse-glow 8s infinite alternate ease-in-out'
      }} />

      <div style={{
        position: 'absolute',
        bottom: '-15%',
        left: '-10%',
        width: '50vw',
        height: '50vw',
        background: 'radial-gradient(circle, rgba(255, 80, 0, 0.12) 0%, transparent 70%)',
        filter: 'blur(120px)',
        borderRadius: '50%',
        animation: 'pulse-glow 12s infinite alternate-reverse ease-in-out'
      }} />

      {/* Floating Animated Smokes & Embers */}
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        <filter id="smoke-blur">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        
        {/* Smoke Particles - Soft, greyish-white blobs */}
        {[...Array(15)].map((_, i) => (
          <circle
            key={`smoke-${i}`}
            cx={`${Math.random() * 100}%`}
            cy="110%"
            r={Math.random() * 20 + 10}
            fill="rgba(200, 200, 200, 0.05)"
            filter="url(#smoke-blur)"
            style={{
              animation: `smoke-drift ${15 + Math.random() * 15}s infinite linear`,
              animationDelay: `-${Math.random() * 20}s`,
            }}
          />
        ))}

        {/* Small Ember Particles - Vibrant red/gold */}
        {[...Array(20)].map((_, i) => (
          <circle
            key={`ember-${i}`}
            cx={`${Math.random() * 100}%`}
            cy="110%"
            r={Math.random() * 1.5 + 0.5}
            fill={i % 2 === 0 ? '#ff3300' : '#ffcc00'}
            style={{
              animation: `ember-ascend ${8 + Math.random() * 8}s infinite linear`,
              animationDelay: `-${Math.random() * 10}s`,
              opacity: 0.6,
              filter: 'drop-shadow(0 0 2px rgba(255, 50, 0, 0.8))'
            }}
          />
        ))}
      </svg>

      <style>{`
        @keyframes pulse-glow {
          0% { transform: scale(1) translate(0, 0); opacity: 0.8; }
          50% { transform: scale(1.1) translate(2%, 2%); opacity: 1; }
          100% { transform: scale(0.95) translate(-1%, -1%); opacity: 0.7; }
        }
        @keyframes smoke-drift {
          0% { transform: translateY(0) translateX(0) scale(1); opacity: 0; }
          20% { opacity: 0.4; }
          80% { opacity: 0.2; }
          100% { transform: translateY(-120vh) translateX(100px) scale(2); opacity: 0; }
        }
        @keyframes ember-ascend {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-120vh) translateX(-40px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
