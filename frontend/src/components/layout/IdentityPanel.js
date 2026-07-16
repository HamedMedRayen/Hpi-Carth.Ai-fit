import React, { useState, useEffect, useMemo } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../utils/auth";
import { useTheme } from "../../utils/theme";
import { api } from "../../utils/api";
import StatRing from "../StatRing";
import {
  Moon, Sun, Leaf, Flame, Contrast, LogOut, Zap,
  ChevronRight, Trophy, Settings,
  LayoutDashboard, Sword, Dna, MessageCircle, Users
} from "lucide-react";
import OrbThemeSwitcher from "../OrbThemeSwitcher";

/* ── Rose icon for Queen theme ─────────────────────────── */
const RoseIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round"
    strokeLinejoin="round">
    <path d="M12 22V12" />
    <path d="M12 12C12 12 7 10 7 6a5 5 0 0 1 10 0c0 4-5 6-5 6z" />
    <path d="M9 18c-1.5 0-3-1-3-3" />
    <path d="M15 18c1.5 0 3-1 3-3" />
    <path d="M9 22h6" />
  </svg>
);

/* ── 3-Pillar Navigation ─────────────────────────────── */
const NAV_SECTIONS = [
  { id: 'command', label: 'Command', path: '/', end: true, Icon: LayoutDashboard },
  { id: 'coaching', label: 'Coach Zone', path: '/coach', end: false, Icon: Users },
  { id: 'performance', label: 'Performance', path: '/workouts', end: false, Icon: Sword },
  { id: 'biometrics', label: 'Biometrics', path: '/measurements', end: false, Icon: Dna },
];

/* ── Sub-navigation chips per pillar ─────────────────── */
const SUB_NAV = {
  command: [
    { label: 'Dashboard', path: '/' },
    { label: 'AI Recommend', path: '/recommend' },
  ],
  coaching: [
    { label: 'Coach Zone', path: '/coach' }
  ],
  performance: [
    { label: 'Sessions', path: '/workouts' },
    { label: 'Log', path: '/log' },
    { label: 'Exercises', path: '/exercises' },
    { label: 'Challenges', path: '/challenges' },
  ],
  biometrics: [
    { label: 'Measurements', path: '/measurements' },
    { label: 'Photos', path: '/photos' },
    { label: 'Nutrition', path: '/nutrition' },
    { label: 'Sleep', path: '/sleep' },
    { label: 'Fatigue', path: '/fatigue-check' },
    { label: 'Injuries', path: '/injuries' },
  ],
};

/* ── Context card per pillar ─────────────────────────── */
function ContextCard({ sectionId, stats }) {
  if (sectionId === 'command') return null; // Redundant as streak is in the main ring

  const contextContent = {
    performance: () => (
      <>
        <div className="id-context-label">Total Volume</div>
        <div className="id-context-value">
          {stats?.total_volume_kg >= 1000
            ? `${(stats.total_volume_kg / 1000).toFixed(1)}t`
            : `${Math.round(stats?.total_volume_kg || 0)}kg`}
        </div>
      </>
    ),
    biometrics: () => (
      <>
        <div className="id-context-label">Avg Session</div>
        <div className="id-context-value">{stats?.avg_duration_minutes || 0}m duration</div>
      </>
    ),
  };

  const Content = contextContent[sectionId];
  if (!Content) return null;

  return (
    <div className="id-context-card">
      <Content />
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   IDENTITY PANEL (Left Side)
   ════════════════════════════════════════════════════════ */
export default function IdentityPanel() {
  const { user, logout } = useAuth();
  const { theme, setTheme, previewTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [stats, setStats] = useState({});
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  // Determine active pillar from path
  const activeSection = useMemo(() => {
    const p = location.pathname;
    if (p === '/' || p.startsWith('/recommend')) return 'command';
    if (p.startsWith('/coach')) return 'coaching';
    if (['/workouts', '/log', '/exercises', '/challenges'].some(s => p.startsWith(s))) return 'performance';
    if (['/measurements', '/photos', '/fatigue-check', '/nutrition', '/sleep', '/injuries'].some(s => p.startsWith(s))) return 'biometrics';
    return 'command';
  }, [location.pathname]);

  // Fetch stats & active challenge
  useEffect(() => {
    if (user?.id) {
      api.getDashboardStats().then(setStats).catch(() => { });
      api.getActiveChallenge().then(r => r.active ? setActiveChallenge(r) : null).catch(() => { });
    }
  }, [location.pathname, user?.id]);

  // Weekly completion for stat ring
  const weeklyCompletion = useMemo(() => {
    const sessions = stats?.weekly_sessions || 0;
    const target = 4; // weekly target: 4 sessions
    return Math.min(100, Math.round((sessions / target) * 100));
  }, [stats]);

  const handleLogout = () => { logout(); navigate("/auth"); };

  const userName = user?.name?.split(' ')[0] || user?.nickname || "Athlete";
  const activeTheme = previewTheme || theme;

  return (
    <aside className="identity-panel" data-collapsed={collapsed}>
      {/* ── Theme hero image background ── */}
      {activeTheme === 'cyberpunk' && (
        <div className="id-hero-bg">
          <img
            key={`hero-${activeTheme}`}
            src={`/images/themes/${activeTheme}.png?v=${activeTheme}`}
            alt=""
            onError={(e) => { e.target.src = "/images/themes/dark.png"; }}
          />
          <div className="id-hero-overlay" />
        </div>
      )}

      {/* ── Content ── */}
      <div className="id-content">

        {/* Top: Avatar + Name */}
        <div className="id-top">
          <div className="id-avatar" onClick={() => navigate('/profile')}>
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={userName} />
            ) : (
              <span>{userName.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="id-greeting">
            <div className="id-name">{userName}</div>
            <div className="id-subtitle">Let's crush it today</div>
          </div>
        </div>

        <div className="id-ring-section">
          <StatRing
            value={weeklyCompletion}
            size={160}
            stroke={8}
            label={`${stats?.current_streak_days || 0}`}
            sublabel="day streak"
          />

          <button
            className="id-rest-day-btn"
            onClick={async () => {
              try {
                await api.logRestDay();
                const newStats = await api.getDashboardStats();
                setStats(newStats);
              } catch (e) {
                console.error("Failed to log rest day", e);
              }
            }}
          >
            <Moon size={12} />
            <span>Rest Day</span>
          </button>
        </div>

        {/* Active Challenge mini-card */}
        {activeChallenge && (
          <div className="id-challenge-card" onClick={() => navigate('/challenges')}>
            <Trophy size={14} />
            <div className="id-challenge-info">
              <span className="id-challenge-name">{activeChallenge.challenge_details?.name}</span>
              <span className="id-challenge-progress">
                Day {(activeChallenge.user_challenge?.progress_days?.length || 0) + 1}
              </span>
            </div>
            <ChevronRight size={14} style={{ opacity: 0.4, marginLeft: 'auto' }} />
          </div>
        )}

        {/* Context card — adapts to section */}
        <ContextCard sectionId={activeSection} stats={stats} />

        {/* ── 3-Pillar Navigation ── */}
        <nav className="id-nav">
          {NAV_SECTIONS.map(({ id, label, path, end, Icon }) => {
            const isActive = activeSection === id;
            return (
              <NavLink
                key={id}
                to={path}
                end={end}
                className={`id-nav-link${isActive ? ' active' : ''}`}
              >
                {isActive && <div className="id-nav-indicator" />}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isActive ? 'var(--aura-accent)' : 'var(--id-surface)',
                    border: isActive ? 'none' : '1px solid var(--id-border)',
                    flexShrink: 0,
                    transition: 'all 0.2s',
                  }}>
                    <Icon size={15} color={isActive ? 'var(--color-on-accent)' : 'var(--id-text-muted)'} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: isActive ? 700 : 500 }}>{label}</div>
                    <div style={{ fontSize: 10, opacity: 0.5, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      {id === 'command' ? 'Dashboard · AI' : id === 'coaching' ? 'Coaching · Gyms' : id === 'performance' ? 'Train · Log · Atlas' : 'Body · Health'}
                    </div>
                  </div>
                </div>
              </NavLink>
            );
          })}
        </nav>

        {/* ── Bottom: Theme switcher + Sign out ── */}
        <div className="id-bottom">
          <div className="id-footer-row">
            <button className="id-settings-btn" onClick={() => navigate('/profile')} title="Settings">
              <Settings size={18} />
            </button>

            <div className="id-theme-orb-wrap">
              <OrbThemeSwitcher />
            </div>

            <button className="id-logout-btn" onClick={handleLogout} title="Sign out">
              <LogOut size={18} />
            </button>
          </div>

          <div className="id-footer-meta">
            <button
              className="id-feedback-btn"
              onClick={() => window.location.href = "mailto:rayenbenhamed1288@gmail.com?subject=HPI App Feedback"}
            >
              <MessageCircle size={14} />
              <span>Send Feedback</span>
            </button>

            <div className="id-status-badge">
              <div className="id-status-dot" />
              <span>AI Engine Active</span>
            </div>
            <div className="id-version-tag">HPI — HIGH PERFORMANCE INDICATOR</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ── Export sub-navigation for use in right panel ── */
export { SUB_NAV };
