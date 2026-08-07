import React, { useMemo } from 'react';

/**
 * SVG Arc Ring — shows weekly completion as a circular progress indicator.
 */
export default function StatRing({
  value = 0,
  size = 140,
  stroke = 6,
  color = 'var(--aura-accent)',
  trackColor,
  label,
  sublabel
}) {
  const clamped = Math.min(100, Math.max(0, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const displayLabel = label ?? `${Math.round(clamped)}`;

  // Compute a safe hex color for drop-shadow (CSS vars don't work in filter)
  const glowColor = 'rgba(var(--aura-accent-rgb), 0.5)';

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}
      >
        {/* Track — very subtle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--id-border)"
          strokeWidth={stroke}
          opacity={0.5}
        />
        {/* Progress Arc */}
        {clamped > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        )}
      </svg>
      {/* Center text */}
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none'
      }}>
        <span style={{
          fontFamily: "'Space Grotesk', system-ui, sans-serif",
          fontSize: size * 0.32,
          fontWeight: 800,
          color: 'var(--id-text)',
          lineHeight: 1,
          letterSpacing: '-0.02em'
        }}>
          {displayLabel}
        </span>
        {sublabel && (
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--id-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginTop: 6
          }}>
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
