import { WIDGET_REGISTRY, METRIC_LABELS } from '../../config/widgets'
import { X, Check, ArrowLeft, Shield } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'
import { api } from '../../utils/api'
import { useAuth } from '../../utils/auth'
import ExercisePicker from './../widgets/ExercisePicker'

export default function AddWidgetModal({ page, widgets, hasWidget, onAdd, onClose }) {
  const { user } = useAuth()
  const isCoach = user?.role === 'coach' || user?.profile?.role === 'coach'
  const available = WIDGET_REGISTRY.filter(w => {
    if (!w.pages.includes(page)) return false
    if (w.role === 'coach' && !isCoach) return false
    return true
  })
  const modalRef = useRef()

  // config flow state
  const [configStep, setConfigStep] = useState(0) // 0: main list, 1: exercise search, 2: metric pick
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedExercise, setSelectedExercise] = useState(null)

  useEffect(() => {
    const handleEscape = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  useEffect(() => {
    if (configStep === 1 && searchQuery.length > 1) {
      const delay = setTimeout(() => {
        api.searchExercises(searchQuery).then(setSearchResults).catch(() => {})
      }, 300)
      return () => clearTimeout(delay)
    } else {
      setSearchResults([])
    }
  }, [searchQuery, configStep])

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  const handleWidgetClick = (id) => {
    if (id === 'exercise_tracker') {
      setConfigStep(1)
    } else {
      if (!hasWidget(id)) onAdd(id)
    }
  }

  const handleExerciseSelect = (ex) => {
    setSelectedExercise(ex)
    setConfigStep(2)
  }

  const handleMetricSelect = (metric) => {
    onAdd('exercise_tracker', { exerciseId: selectedExercise.id, exerciseName: selectedExercise.name, metric })
    onClose()
  }

  return (
    <>
      <div 
        onClick={handleOverlayClick}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', 
          zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
      >
        <div 
          ref={modalRef}
          style={{
            width: '100%', maxWidth: 560, maxHeight: '80vh',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-card)',
            borderRadius: 16, overflowY: 'auto',
            display: 'flex', flexDirection: 'column'
          }}
        >
          {configStep === 0 && (
            <>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 10 }}>
                <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>Add Widget</span>
                <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {available.map(w => (
                  <div
                    key={w.id}
                    onClick={() => handleWidgetClick(w.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 20px',
                      borderBottom: '1px solid var(--border-card)',
                      cursor: hasWidget(w.id) ? 'default' : 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={e => { if (!hasWidget(w.id)) e.currentTarget.style.background = 'var(--bg-card-hover)' }}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-card)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <w.Icon size={17} color={w.role === 'coach' ? 'var(--aura-accent)' : 'var(--text-muted)'} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: 15, color: hasWidget(w.id) ? 'var(--text-muted)' : 'var(--text-primary)' }}>{w.label}</span>
                        {w.role === 'coach' && (
                          <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: 'rgba(139, 92, 246, 0.2)', color: 'var(--aura-accent)', textTransform: 'uppercase' }}>
                            Coach
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{w.subtitle}</div>
                    </div>
                    {hasWidget(w.id) ? (
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                        background: 'var(--accent-primary)',
                        border: '1.5px solid var(--accent-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s ease',
                      }}>
                        <Check size={12} color="#000" strokeWidth={3} />
                      </div>
                    ) : (
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                        border: '1.5px solid var(--border-card)',
                        background: 'transparent',
                      }} />
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {configStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 400 }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', zIndex: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button onClick={() => setConfigStep(0)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><ArrowLeft size={18} /></button>
                  <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>Select Exercise</span>
                </div>
                <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
              </div>
              
              {/* Embed the visual ExercisePicker logic here or use it as a component */}
              <div style={{ flex: 1, padding: '0 20px 20px', overflowY: 'auto' }}>
                <ExercisePicker 
                  onSelect={handleExerciseSelect} 
                  onClose={() => setConfigStep(0)} 
                  isInline={true}
                />
              </div>
            </div>
          )}

          {configStep === 2 && (
            <>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button onClick={() => setConfigStep(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><ArrowLeft size={18} /></button>
                  <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 300 }}>{selectedExercise?.name}</span>
                </div>
                <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', padding: '10px 0' }}>
                {Object.entries(METRIC_LABELS).map(([key, label]) => (
                  <div
                    key={key}
                    onClick={() => handleMetricSelect(key)}
                    style={{
                      padding: '16px 24px', borderBottom: '1px solid var(--border-card)',
                      cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 600, fontSize: 15
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {label}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
