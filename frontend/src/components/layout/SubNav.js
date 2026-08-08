import React, { useMemo } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { SUB_NAV } from "./IdentityPanel";
import { useAuth } from "../../utils/auth";
import NotificationCenter from "./NotificationCenter";
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
  '/coach/events':  Trophy,
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

const SECTION_TITLES = {
  command:     'Command',
  coaching:    'Coach Zone',
  performance: 'Performance',
  biometrics:  'Biometrics',
};

/**
 * SubNav — unified top header bar:
 * Section label + navigation tabs on left, Notifications + Profile Avatar on right.
 */
export default function SubNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const activeSection = useMemo(() => {
    const p = location.pathname;
    if (p === '/' || p.startsWith('/recommend')) return 'command';
    if (p.startsWith('/coach')) return 'coaching';
    if (['/workouts', '/log', '/exercises', '/challenges'].some(s => p.startsWith(s))) return 'performance';
    if (['/measurements', '/photos', '/fatigue-check', '/nutrition', '/sleep', '/injuries'].some(s => p.startsWith(s))) return 'biometrics';
    return 'command';
  }, [location.pathname]);

  const chips = SUB_NAV[activeSection] || [];

  const accentColor = 'var(--aura-accent)';
  const sectionTitle = SECTION_TITLES[activeSection] || 'Dashboard';
  const userName = user?.name?.split(' ')[0] || user?.nickname || "Athlete";

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 35,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 52,
      padding: '0 24px',
      background: 'color-mix(in srgb, var(--color-bg2) 85%, transparent)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--color-border)',
      flexShrink: 0,
    }}>
      {/* Left: Section Indicator + Sub-tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, overflowX: 'auto', scrollbarWidth: 'none' }}>
        <div style={{
          fontSize: 12,
          fontWeight: 800,
          color: 'var(--color-text-3)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          paddingRight: 12,
          borderRight: '1px solid var(--color-border)',
          whiteSpace: 'nowrap',
        }}>
          {sectionTitle}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {chips.map(({ label, path }) => {
            const Icon = ICONS[path] || LayoutDashboard;
            const isExact = path === '/' || path === '/coach';
            const isActive = isExact
              ? location.pathname === path
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
                  padding: '6px 12px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: isActive
                    ? 'color-mix(in srgb, var(--aura-accent) 12%, transparent)'
                    : 'transparent',
                  color: isActive ? 'var(--color-text)' : 'var(--color-text-3)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: 13,
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                }}>
                  <Icon
                    size={14}
                    style={{
                      color: isActive ? accentColor : 'var(--color-text-3)',
                      transition: 'color 0.2s',
                      flexShrink: 0,
                    }}
                  />
                  <span>{label}</span>
                </div>
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Right: Notifications + Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <NotificationCenter />
        <div
          onClick={() => navigate('/profile')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: 10,
            background: 'var(--id-surface, rgba(255,255,255,0.04))',
            border: '1px solid var(--color-border)',
            transition: 'all 0.2s ease',
          }}
          title="User Profile & Settings"
        >
          <div style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            background: 'var(--aura-accent)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 800,
            overflow: 'hidden',
          }}>
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              userName.charAt(0).toUpperCase()
            )}
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }} className="desktop-only">
            {userName}
          </span>
        </div>
      </div>
    </header>
  );
}

