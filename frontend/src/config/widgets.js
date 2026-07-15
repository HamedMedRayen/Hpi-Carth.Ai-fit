import {
  BarChart2, Scale, RefreshCw, Activity, TrendingUp,
  Calendar, Zap, Heart, Target, Dumbbell
} from 'lucide-react'

export const WIDGET_REGISTRY = [
  {
    id: 'workouts_per_week',
    label: 'Workouts per week',
    subtitle: 'Track your completed workouts each week',
    Icon: Calendar,
    pages: ['dashboard', 'progress'],
  },
  {
    id: 'weight_over_time',
    label: 'Weight over time',
    subtitle: 'Track your bodyweight progression',
    Icon: Scale,
    pages: ['dashboard', 'progress'],
  },
  {
    id: 'reps_over_time',
    label: 'Reps over time',
    subtitle: 'Track your rep count per exercise',
    Icon: RefreshCw,
    pages: ['dashboard', 'progress'],
  },
  {
    id: 'weight_reps_combined',
    label: 'Weight & Reps',
    subtitle: 'Visualize weight and reps together over time',
    Icon: BarChart2,
    pages: ['dashboard', 'progress'],
  },
  {
    id: 'volume_progression',
    label: 'Volume Progression',
    subtitle: 'Session load over time',
    Icon: TrendingUp,
    pages: ['dashboard'],
  },
  {
    id: 'weekly_volume',
    label: 'Weekly Volume',
    subtitle: 'This week vs last week comparison',
    Icon: Activity,
    pages: ['dashboard'],
  },
  {
    id: 'training_split',
    label: 'Training Split',
    subtitle: 'Muscle group distribution donut chart',
    Icon: Target,
    pages: ['dashboard'],
  },
  {
    id: 'activity_map',
    label: 'Activity Map',
    subtitle: 'Workout intensity calendar heatmap',
    Icon: Calendar,
    pages: ['dashboard', 'progress'],
  },
  {
    id: 'streak_tracker',
    label: 'Streak Tracker',
    subtitle: 'Current and best training streak',
    Icon: Zap,
    pages: ['dashboard'],
  },
  {
    id: 'fatigue_history',
    label: 'Fatigue History',
    subtitle: 'Recent fatigue check results',
    Icon: Heart,
    pages: ['dashboard', 'progress'],
  },
  {
    id: 'exercise_tracker',
    label: 'Exercise Tracker',
    subtitle: 'Track a specific exercise over time',
    Icon: Dumbbell,
    pages: ['dashboard', 'progress'],
  },
  {
    id: 'sleep_tracker',
    label: 'Sleep Tracker',
    subtitle: 'Correlate sleep with workout volume',
    Icon: Zap,
    pages: ['dashboard', 'progress'],
  },
]

export const METRIC_LABELS = {
  est_1rm:      'Best set (est. 1RM)',
  max_weight:   'Best set (max weight)',
  total_volume: 'Total volume',
  best_reps:    'Best set (reps)',
}
