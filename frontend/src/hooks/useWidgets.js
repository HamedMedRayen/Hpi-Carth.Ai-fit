import { useState, useEffect } from 'react'
import { getSyncItem, setItem } from '../utils/storage'

export function useWidgets(page) {
  const storageKey = `aurafit_widgets_${page}`

  const defaults = {
    dashboard: ['volume_progression', 'weekly_volume', 'training_split',
      'activity_map', 'streak_tracker', 'fatigue_history'],
    progress: ['workouts_per_week', 'weight_over_time'],
  }

  const [widgets, setWidgets] = useState(() => {
    try {
      const saved = getSyncItem(storageKey)
      return saved ? JSON.parse(saved) : defaults[page] || []
    } catch { return defaults[page] || [] }
  })

  useEffect(() => {
    setItem(storageKey, JSON.stringify(widgets))
  }, [widgets, storageKey])

  const addWidget = (id, config = null) => {
    if (config) {
      const instanceKey = `${id}_${Date.now()}`
      setWidgets(prev => [...prev, { id, instanceKey, ...config }])
    } else {
      if (!hasWidget(id)) setWidgets(prev => [...prev, id])
    }
  }

  const removeWidget = (keyOrId) => {
    setWidgets(prev => prev.filter(w => {
      if (typeof w === 'string') return w !== keyOrId
      return w.instanceKey !== keyOrId && w.id !== keyOrId
    }))
  }

  const hasWidget = (id) => {
    // If it's a configurable widget, we allow multiple, so hasWidget should return false
    // so the Add Widget button isn't disabled.
    if (id === 'exercise_tracker') return false
    return widgets.some(w => typeof w === 'string' ? w === id : w.id === id)
  }

  return { widgets, addWidget, removeWidget, hasWidget }
}
