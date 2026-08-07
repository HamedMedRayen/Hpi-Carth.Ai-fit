import React from 'react';
import { useTheme } from '../../utils/theme';

/**
 * Sky Theme Background
 * Features drifting high-visibility clouds in a sky blue environment.
 */
export default function SkyBackground() {
  const { theme, previewTheme } = useTheme();
  const activeTheme = previewTheme || theme;

  if (activeTheme !== 'light') return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: -1,
      overflow: 'hidden',
      pointerEvents: 'none',
      background: 'linear-gradient(to bottom, #7dd3fc 0%, #e0f2fe 100%)'
    }}>
      {/* Cloud 1 */}
      <div className="cloud-v2" style={{ top: '10%', animationDuration: '40s', transform: 'scale(1.4)' }}>
        <div className="cloud-part" style={{ width: 100, height: 100, left: 0 }} />
        <div className="cloud-part" style={{ width: 120, height: 120, left: 50, top: -20 }} />
        <div className="cloud-part" style={{ width: 100, height: 100, left: 110, top: 0 }} />
      </div>

      {/* Cloud 2 */}
      <div className="cloud-v2" style={{ top: '40%', animationDuration: '30s', animationDelay: '-15s', transform: 'scale(0.9)' }}>
        <div className="cloud-part" style={{ width: 80, height: 80, left: 0 }} />
        <div className="cloud-part" style={{ width: 90, height: 90, left: 40, top: -10 }} />
      </div>

      {/* Cloud 3 */}
      <div className="cloud-v2" style={{ top: '70%', animationDuration: '50s', animationDelay: '-5s', transform: 'scale(1.2)' }}>
        <div className="cloud-part" style={{ width: 120, height: 120, left: 0 }} />
        <div className="cloud-part" style={{ width: 100, height: 100, left: 80, top: 10 }} />
      </div>

      <style>{`
        .cloud-v2 {
          position: absolute;
          left: -400px;
          opacity: 0.8;
          filter: blur(10px);
          animation: drift-sky linear infinite;
        }
        .cloud-part {
          position: absolute;
          background: #ffffff;
          border-radius: 50%;
          box-shadow: inset -5px -5px 15px rgba(0,0,0,0.05);
        }
        @keyframes drift-sky {
          from { transform: translateX(0); }
          to { transform: translateX(calc(100vw + 800px)); }
        }
      `}</style>
    </div>
  );
}
