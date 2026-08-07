import { useState } from 'react';
import { useTheme } from '../../utils/theme';

const COLORS = ['#f9a8d4','#f472b6','#ec4899','#db2777','#fbcfe8','#fda4af','#fecdd3'];

// Single SVG rose petal cluster
const RoseSVG = ({ size, color, opacity }) => (
  <svg width={size} height={size} viewBox="0 0 100 100"
       style={{ opacity }} xmlns="http://www.w3.org/2000/svg">
    {/* Center */}
    <circle cx="50" cy="50" r="10" fill={color} />
    {/* 8 petals */}
    {[0,45,90,135,180,225,270,315].map((angle, i) => (
      <ellipse key={i}
        cx="50" cy="50" rx="8" ry="20"
        fill={color}
        transform={`rotate(${angle} 50 50) translate(0 -18)`}
        style={{ transformOrigin: '50px 50px' }}
        opacity="0.85"
      />
    ))}
    {/* Inner petals slightly lighter */}
    {[22,67,112,157,202,247,292,337].map((angle, i) => (
      <ellipse key={`inner-${i}`}
        cx="50" cy="50" rx="5" ry="14"
        fill={color}
        transform={`rotate(${angle} 50 50) translate(0 -12)`}
        style={{ transformOrigin: '50px 50px' }}
        opacity="0.65"
      />
    ))}
  </svg>
);

const FLOWER_COUNT = 18;

const makeFlower = () => ({
  id:       Math.random(),
  x:        Math.random() * 100,           // vw %
  startY:   110 + Math.random() * 20,      // start below screen
  size:     Math.random() * 28 + 14,       // 14–42px
  duration: Math.random() * 14 + 12,       // 12–26s
  delay:    Math.random() * -20,           // stagger
  color:    COLORS[Math.floor(Math.random() * COLORS.length)],
  opacity:  Math.random() * 0.35 + 0.15,  // 0.15–0.50 subtle
  drift:    (Math.random() - 0.5) * 80,   // horizontal drift px
  spin:     Math.random() * 360,           // rotation
});

export default function FlowerBackground() {
  const { theme, previewTheme } = useTheme();
  const activeTheme = previewTheme || theme;
  const [flowers] = useState(() => Array.from({ length: FLOWER_COUNT }, makeFlower));

  if (activeTheme !== 'queen') return null;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      zIndex: 0, pointerEvents: 'none',
      overflow: 'hidden',
    }}>
      {flowers.map(f => (
        <div key={f.id} style={{
          position: 'absolute',
          left:     `${f.x}%`,
          bottom:   `-${f.size}px`,
          width:    f.size,
          height:   f.size,
          animation: `floatFlower ${f.duration}s ${f.delay}s linear infinite`,
          '--drift': `${f.drift}px`,
          '--spin':  `${f.spin}deg`,
        }}>
          <RoseSVG size={f.size} color={f.color} opacity={f.opacity} />
        </div>
      ))}

      <style>{`
        @keyframes floatFlower {
          0%   { transform: translateY(0)      translateX(0)            rotate(0deg); opacity: 0; }
          5%   { opacity: 1; }
          95%  { opacity: 1; }
          100% { transform: translateY(-110vh) translateX(var(--drift)) rotate(var(--spin)); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
