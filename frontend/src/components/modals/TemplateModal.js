import React, { useState } from 'react';
import { FolderOpen, Save, Trash2 } from 'lucide-react';
import { api } from '../../utils/api';

/**
 * TemplateModal - Save/Load workout templates
 * Props: open, onClose, currentExercises, onLoad
 */
export default function TemplateModal({ open, onClose, currentExercises, onLoad, initialMode = 'load' }) {
  const [mode, setMode] = useState(initialMode); // 'load' or 'save'
  const [templates, setTemplates] = useState([]);
  const [templateName, setTemplateName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load templates when modal opens
  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.getTemplates()
      .then(t => setTemplates(t || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [open]);

  const handleSave = async () => {
    if (!templateName.trim()) {
      setError('Template name required');
      return;
    }
    setLoading(true);
    try {
      const validExercises = currentExercises.filter(ex => ex.exercise_name && ex.exercise_name.trim());
      if (validExercises.length === 0) {
        setError('Please add at least one valid exercise to save a template.');
        setLoading(false);
        return;
      }

      await api.saveTemplate({
        name: templateName,
        exercises: validExercises.map(ex => ({
          exercise_name: ex.exercise_name,
          sets: ex.sets.map(s => ({
            reps: s.reps,
            weight_kg: s.weight_kg,
            set_type: s.set_type || 'normal'
          }))
        }))
      });
      setTemplateName('');
      setMode('load');
      // Reload templates
      const t = await api.getTemplates();
      setTemplates(t || []);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoad = async (template) => {
    if (onLoad) {
      const exercises = template.exercises || [];
      onLoad(exercises, template.name);
    }
    onClose();
  };

  const handleDelete = async (templateId) => {
    if (!window.confirm('Delete this template?')) return;
    setLoading(true);
    try {
      await api.deleteTemplate(templateId);
      const t = await api.getTemplates();
      setTemplates(t || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: 'var(--color-bg2)',
        borderRadius: 16,
        padding: '24px',
        maxWidth: '500px',
        width: '100%',
        maxHeight: '80vh',
        overflow: 'auto',
        border: '1px solid var(--color-border)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Workout Templates</h2>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: 'var(--color-text-3)' }}>
            ×
          </button>
        </div>

        {/* Mode selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {['load', 'save'].map(m => {
            const Icon = m === 'load' ? FolderOpen : Save;
            return (
              <button key={m}
                onClick={() => setMode(m)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: 8,
                  border: '1.5px solid',
                  background: mode === m ? 'var(--aura-accent)' : 'transparent',
                  color: mode === m ? 'var(--color-on-accent)' : 'var(--color-text-3)',
                  borderColor: mode === m ? 'var(--aura-accent)' : 'var(--color-border)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 13,
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}>
                <Icon size={16} strokeWidth={1.8} />
                {m === 'load' ? 'Load' : 'Save'}
              </button>
            );
          })}
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            padding: 12,
            borderRadius: 8,
            fontSize: 12,
            marginBottom: 12
          }}>
            {error}
          </div>
        )}

        {mode === 'load' ? (
          <>
            {loading && <p style={{ color: 'var(--color-text-3)', textAlign: 'center' }}>Loading templates...</p>}
            {!loading && templates.length === 0 && (
              <p style={{ color: 'var(--color-text-3)', textAlign: 'center' }}>No templates saved yet</p>
            )}
            {!loading && templates.map(t => (
              <div key={t.id}
                style={{
                  background: 'var(--color-bg)',
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 8,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  border: '1px solid var(--color-border)'
                }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: 'var(--color-text)' }}>
                    {t.name}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-3)' }}>
                    {t.exercises ? t.exercises.length : 0} exercises
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => handleLoad(t)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      border: 'none',
                    background: 'var(--aura-accent)',
                    color: 'var(--color-on-accent)',
                    cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: 12,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}>
                    <FolderOpen size={14} strokeWidth={1.8} />
                    Load
                  </button>
                  <button onClick={() => handleDelete(t.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--color-border)',
                      background: 'transparent',
                      color: 'var(--color-text-3)',
                      cursor: 'pointer',
                      fontSize: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}>
                    <Trash2 size={14} strokeWidth={1.8} />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </>
        ) : (
          <>
            {currentExercises.filter(ex => ex.exercise_name && ex.exercise_name.trim()).length === 0 ? (
              <p style={{ color: 'var(--color-text-3)', textAlign: 'center' }}>Add exercises first to save a template</p>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Template name..."
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg)',
                    color: 'var(--color-text)',
                    fontSize: 13,
                    marginBottom: 12,
                    boxSizing: 'border-box'
                  }}
                />
                <div style={{ 
                  background: 'var(--color-bg)',
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 12,
                  fontSize: 12
                }}>
                  <p style={{ margin: '0 0 8px', fontWeight: 600, color: 'var(--color-text)' }}>Preview:</p>
                  {currentExercises.filter(ex => ex.exercise_name && ex.exercise_name.trim()).map((ex, i) => (
                    <div key={i} style={{ fontSize: 11, color: 'var(--color-text-3)', marginBottom: 4 }}>
                      • {ex.exercise_name} ({ex.sets.length} sets)
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'var(--aura-accent)',
                    color: 'var(--color-on-accent)',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    fontSize: 14,
                    opacity: loading ? 0.6 : 1
                  }}>
                  {loading ? 'Saving...' : 'Save Template'}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
