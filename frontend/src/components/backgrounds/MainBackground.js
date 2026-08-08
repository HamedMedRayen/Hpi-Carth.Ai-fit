import React from 'react';
import { useTheme } from '../../utils/theme';

/**
 * Main Theme Background (Travel Ease & Airline Trust Concept)
 * Features soft drifting sky blue & cool gray ambient glows with subtle travel vector curves.
 */
export default function MainBackground() {
  const { theme, previewTheme } = useTheme();
  const activeTheme = previewTheme || theme;

  if (activeTheme !== 'main') return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        overflow: 'hidden',
        pointerEvents: 'none',
        background: 'radial-gradient(circle at 10% 10%, #e0f2fe 0%, #f0f9ff 60%, #f8fafc 100%)',
      }}
    >
      {/* Flight Path Geometric Curve Lines */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 0.35,
        }}
        viewBox="0 0 1440 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M-100 200 C 300 100, 700 450, 1540 150"
          stroke="url(#sky-grad-1)"
          strokeWidth="2"
          strokeDasharray="8 8"
        />
        <path
          d="M-50 650 C 450 850, 950 400, 1500 700"
          stroke="url(#sky-grad-2)"
          strokeWidth="1.5"
        />
        <defs>
          <linearGradient id="sky-grad-1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="sky-grad-2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.2" />
            <stop offset="70%" stopColor="#0284c7" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.8" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
