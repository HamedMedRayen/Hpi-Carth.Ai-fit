export const fmt = {
  kg: (v) => `${Number(v).toFixed(1)} kg`,
  tonnes: (v) => `${Number(v).toFixed(2)} t`,
  pct: (v) => `${Number(v).toFixed(1)}%`,
  int: (v) => Math.round(Number(v)).toLocaleString(),
  dec: (v, d = 2) => Number(v).toFixed(d),
  duration: (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  },
  date: (str) => {
    if (!str) return "—";
    try {
      return new Date(str).toLocaleDateString("en-GB", {
        day: "numeric", month: "short", year: "numeric",
      });
    } catch { return str; }
  },
  shortDate: (str) => {
    if (!str) return "—";
    try {
      return new Date(str).toLocaleDateString("en-GB", {
        day: "numeric", month: "short",
      });
    } catch { return str; }
  },
};

export const MUSCLE_COLORS = {
  chest:      "#7c3aed",
  back:       "#0ea5e9",
  quads:      "#10b981",
  hamstrings: "#8b5cf6",
  shoulders:  "#f59e0b",
  biceps:     "#06b6d4",
  triceps:    "#ec4899",
  glutes:     "#84cc16",
  calves:     "#f97316",
  core:       "#6366f1",
  other:      "#94a3b8",
};

export const CHART_COLORS = [
  "#7c3aed", "#0ea5e9", "#10b981", "#f59e0b",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316",
];
