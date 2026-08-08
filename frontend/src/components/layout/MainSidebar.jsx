import React, { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../utils/auth";
import { useTheme } from "../../utils/theme";
import { api } from "../../utils/api";
import { HpiLogo } from "../../utils/icons";
import {
  LayoutDashboard, Dumbbell, Dna, Users, Sparkles,
  Moon, Trophy, Settings, LogOut, Activity, Flame, ArrowUpRight
} from "lucide-react";

/* ── Main Theme Section Groups ────────────────────── */
const MAIN_SECTIONS = [
  {
    id: "command",
    title: "Command Center",
    subtitle: "Overview & AI Engine",
    path: "/",
    end: true,
    Icon: LayoutDashboard,
    badge: "AI Active",
  },
  {
    id: "training",
    title: "Training Hub",
    subtitle: "Workouts & Logs",
    path: "/workouts",
    end: false,
    Icon: Dumbbell,
    badge: "Active",
  },
  {
    id: "biometrics",
    title: "Biometrics",
    subtitle: "Health & Telemetry",
    path: "/measurements",
    end: false,
    Icon: Dna,
  },
  {
    id: "coaching",
    title: "Coach Zone",
    subtitle: "Directory & Events",
    path: "/coach",
    end: false,
    Icon: Users,
  },
];

export default function MainSidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [stats, setStats] = useState({});
  const [activeChallenge, setActiveChallenge] = useState(null);

  const activeSectionId = (() => {
    const p = location.pathname;
    if (p === "/" || p.startsWith("/recommend")) return "command";
    if (["/workouts", "/log", "/exercises", "/challenges"].some((s) => p.startsWith(s))) return "training";
    if (["/measurements", "/photos", "/fatigue-check", "/nutrition", "/sleep", "/injuries"].some((s) => p.startsWith(s))) return "biometrics";
    if (p.startsWith("/coach")) return "coaching";
    return "command";
  })();

  useEffect(() => {
    if (user?.id) {
      api.getDashboardStats().then(setStats).catch(() => {});
      api.getActiveChallenge().then((r) => (r?.active ? setActiveChallenge(r) : null)).catch(() => {});
    }
  }, [user?.id]);

  const userName = user?.name?.split(" ")[0] || user?.nickname || "Athlete";

  const userStatus = (() => {
    if (user?.role === "coach" || user?.is_coach) return "Coach";

    const level =
      user?.fitness_level ||
      user?.experience ||
      user?.onboarding_data?.fitness_level ||
      user?.onboarding_data?.experience_level ||
      user?.survey_answers?.fitness_level ||
      user?.level;

    if (level && typeof level === "string") {
      return level.charAt(0).toUpperCase() + level.slice(1);
    }
    return "Athlete";
  })();

  return (
    <aside className="main-sidebar-dock">
      {/* ── Brand Logo Header ── */}
      <div className="main-brand-header">
        <div className="main-brand-logo">
          <img
            src="/logo/hpi-logo-transparent.png"
            alt="HPI Logo"
            style={{
              height: 32,
              width: "auto",
              objectFit: "contain",
              filter: "brightness(0) invert(1)",
              WebkitFilter: "brightness(0) invert(1)",
            }}
          />
          <span className="main-brand-pill">MAIN</span>
        </div>
        <div className="main-brand-sub">Hyper Performance Indicator</div>
      </div>

      {/* ── User Profile Mini-Card ── */}
      <div className="main-user-card" onClick={() => navigate("/profile")}>
        <div className="main-user-avatar">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt={userName} />
          ) : (
            <span>{userName.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="main-user-info">
          <div className="main-user-name">{userName}</div>
          <div className="main-user-status">
            <span className="main-dot-live" />
            <span>{userStatus}</span>
          </div>
        </div>
        <ArrowUpRight size={14} className="main-arrow-link" />
      </div>

      {/* ── Streak & Rest Day Action ── */}
      <div className="main-streak-card">
        <div className="main-streak-top">
          <div className="main-streak-count">
            <Flame size={18} color="#0ea5e9" />
            <span>{stats?.current_streak_days || 0} Day Streak</span>
          </div>
          <button
            className="main-rest-btn"
            title="Log Rest Day"
            onClick={async () => {
              try {
                await api.logRestDay();
                const newStats = await api.getDashboardStats();
                setStats(newStats);
              } catch (e) {}
            }}
          >
            <Moon size={12} />
            <span>Rest Day</span>
          </button>
        </div>
      </div>

      {/* ── Main Navigation Architecture ── */}
      <nav className="main-nav-list">
        <div className="main-nav-label">SECTIONS</div>
        {MAIN_SECTIONS.map(({ id, title, subtitle, path, end, Icon, badge }) => {
          const isActive = activeSectionId === id;
          return (
            <NavLink
              key={id}
              to={path}
              end={end}
              className={`main-nav-item${isActive ? " active" : ""}`}
            >
              <div className="main-nav-item-icon">
                <Icon size={18} color={isActive ? "#0ea5e9" : "#64748b"} />
              </div>
              <div className="main-nav-item-text">
                <div className="main-nav-item-title">{title}</div>
                <div className="main-nav-item-sub">{subtitle}</div>
              </div>
              {badge && <span className="main-nav-item-badge">{badge}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* ── Active Challenge Widget ── */}
      {activeChallenge && (
        <div className="main-challenge-box" onClick={() => navigate("/challenges")}>
          <Trophy size={16} color="#0ea5e9" />
          <div>
            <div className="main-challenge-title">{activeChallenge.challenge_details?.name}</div>
            <div className="main-challenge-sub">
              Day {(activeChallenge.user_challenge?.progress_days?.length || 0) + 1} Goal
            </div>
          </div>
        </div>
      )}

      {/* ── Footer / Controls ── */}
      <div className="main-sidebar-footer">
        <button className="main-icon-btn" onClick={() => navigate("/profile")} title="Settings">
          <Settings size={16} />
        </button>
        <button
          className="main-icon-btn danger"
          onClick={() => {
            logout();
            navigate("/auth");
          }}
          title="Sign out"
        >
          <LogOut size={16} />
        </button>
        <div className="main-engine-status">
          <Sparkles size={12} color="#0ea5e9" />
          <span>v2.5 Sky</span>
        </div>
      </div>
    </aside>
  );
}
