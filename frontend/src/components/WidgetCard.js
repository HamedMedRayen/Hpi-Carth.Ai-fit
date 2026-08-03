import React, { useState, useRef, useEffect } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { WIDGET_REGISTRY, METRIC_LABELS } from '../config/widgets'

export default function WidgetCard({ id, config, onRemove, page, children }) {
  const meta = WIDGET_REGISTRY.find(w => w.id === id)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef()

  useEffect(() => {
    const handler = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="glass" style={{
      padding: 24,
      marginBottom: 14,
      position: 'relative',
      background: 'var(--bg-glass)',
      border: '1.5px solid var(--border-card)',
      borderRadius: 24,
      boxShadow: 'var(--shadow-card)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      overflow: 'hidden'
    }}>


      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: 14
      }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
            {id === 'exercise_tracker' ? config?.exerciseName : meta?.label}
          </span>
          {id === 'exercise_tracker' && config?.metric && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {METRIC_LABELS[config.metric]}
            </span>
          )}
        </div>
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: 'transparent', border: 'none',
              cursor: 'pointer', color: 'var(--text-muted)', padding: 4
            }}>
            <MoreHorizontal size={18} />
          </button>
          {menuOpen && (
            <div style={{
              position: 'absolute', right: 0, top: '100%', zIndex: 50,
              background: 'var(--bg-secondary)', border: '1px solid var(--border-card)',
              borderRadius: 10, padding: 4, minWidth: 140, boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
            }}>
              <button onClick={() => { onRemove(); setMenuOpen(false) }}
                style={{
                  width: '100%', padding: '8px 12px', background: 'transparent',
                  border: 'none', cursor: 'pointer', color: 'var(--accent-danger)',
                  fontSize: 13, textAlign: 'left', borderRadius: 7
                }}>
                Remove widget
              </button>
            </div>
          )}
        </div>
      </div>
      {children}
    </div>
  )
}
