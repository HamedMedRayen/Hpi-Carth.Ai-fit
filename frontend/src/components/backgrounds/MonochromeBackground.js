import React from 'react';
import { useTheme } from '../../utils/theme';

/**
 * Monochrome Theme Background
 * Abstract, sleek grey gradients and slow-moving geometric outlines.
 * Fits the black & white aesthetic perfectly.
 */
export default function MonochromeBackground() {
  const { theme, previewTheme } = useTheme();
  const activeTheme = previewTheme || theme;

  if (activeTheme !== 'monochrome') return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: -1,
      overflow: 'hidden',
      background: '#000000',
      pointerEvents: 'none'
    }}>
      {/* Subtle Grey Orbs */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '5%',
        width: '50vw',
        height: '50vw',
        background: 'radial-gradient(circle, rgba(255, 255, 255, 0.03) 0%, transparent 70%)',
        filter: 'blur(80px)',
        borderRadius: '50%',
        animation: 'mono-drift 20s infinite alternate ease-in-out'
      }} />

      <div style={{
        position: 'absolute',
        bottom: '10%',
        right: '5%',
        width: '45vw',
        height: '45vw',
        background: 'radial-gradient(circle, rgba(255, 255, 255, 0.02) 0%, transparent 70%)',
        filter: 'blur(100px)',
        borderRadius: '50%',
        animation: 'mono-drift 25s infinite alternate-reverse ease-in-out'
      }} />

      {/* Abstract Lines / Grid */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
        `,
        backgroundSize: '100px 100px',
        maskImage: 'radial-gradient(circle at center, black, transparent 80%)',
        opacity: 0.5
      }} />

      <style>{`
        @keyframes mono-drift {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(5%, 5%) scale(1.1); }
          100% { transform: translate(-2%, 3%) scale(0.95); }
        }
      `}</style>
    </div>
  );
}
