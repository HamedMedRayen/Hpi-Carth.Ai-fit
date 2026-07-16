import React, { useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { SUB_NAV } from "./IdentityPanel";
import {
  LayoutDashboard, Users2, Sparkles,
  History, PenLine, Dumbbell, Trophy,
  Scale, Camera, Zap,
  Apple, Moon, AlertTriangle,
} from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

/* Icon mapping per sub-path */
const ICONS = {
  '/':              LayoutDashboard,
  '/coach':         Users2,
  '/recommend':     Sparkles,
  '/workouts':      History,
  '/log':           PenLine,
  '/exercises':     Dumbbell,
  '/challenges':    Trophy,
  '/measurements':  Scale,
  '/photos':        Camera,
  '/fatigue-check': Zap,
  '/nutrition':     Apple,
  '/sleep':         Moon,
  '/injuries':      AlertTriangle,
};

/**
 * SubNav — premium full-width tab bar at the top of the content panel.
 * Clearly visible with icons + labels + animated active indicator.
 */
export default function SubNav() {
  const location = useLocation();

  const activeSection = useMemo(() => {
    const p = location.pathname;
    if (p === '/' || p.startsWith('/recommend')) return 'command';
    if (p.startsWith('/coach')) return 'coaching';
    if (['/workouts', '/log', '/exercises', '/challenges'].some(s => p.startsWith(s))) return 'performance';
    if (['/measurements', '/photos', '/fatigue-check', '/nutrition', '/sleep', '/injuries'].some(s => p.startsWith(s))) return 'biometrics';
    return 'command';
  }, [location.pathname]);

  const chips = SUB_NAV[activeSection] || [];
  if (chips.length === 0) return null;

  const sectionColors = {
    command:     'var(--aura-accent)',
    coaching:    'var(--aura-cyan)',
    performance: 'var(--aura-accent)',
    biometrics:  'var(--aura-accent)',
  };
  const accentColor = sectionColors[activeSection];

  return (
    <div style={{
      display: 'flex',
      gap: 2,
      padding: '10px 24px 0',
      background: 'var(--color-bg2)',
      borderBottom: '1px solid var(--color-border)',
      overflowX: 'auto',
      scrollbarWidth: 'none',
      flexShrink: 0,
    }}>
      {chips.map(({ label, path }) => {
        const Icon = ICONS[path] || LayoutDashboard;
        const isExact = path === '/';
        const isActive = isExact
          ? location.pathname === '/'
          : location.pathname.startsWith(path);

        return (
          <NavLink
            key={path}
            to={path}
            end={isExact}
            style={{ textDecoration: 'none' }}
            onClick={async () => {
              if (Capacitor.isNativePlatform()) {
                try {
                  await Haptics.impact({ style: ImpactStyle.Light });
                } catch {}
              }
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px 10px',
              borderRadius: '10px 10px 0 0',
              cursor: 'pointer',
              position: 'relative',
              background: isActive
                ? `color-mix(in srgb, ${accentColor} 10%, transparent)`
                : 'transparent',
              borderBottom: isActive
                ? `2px solid ${accentColor}`
                : '2px solid transparent',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}>
              <Icon
                size={13}
                style={{
                  color: isActive ? accentColor : 'var(--color-text-3)',
                  transition: 'color 0.2s',
                  flexShrink: 0,
                }}
              />
              <span style={{
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? accentColor : 'var(--color-text-3)',
                transition: 'all 0.2s',
                letterSpacing: isActive ? '-0.01em' : 'normal',
              }}>
                {label}
              </span>
            </div>
          </NavLink>
        );
      })}
    </div>
  );
}
