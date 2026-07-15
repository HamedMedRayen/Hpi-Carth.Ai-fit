import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import ProgressLine from './charts/ProgressLine';
import { CheckCircle } from 'lucide-react';

/**
 * BodyWeightForm - Log and track body weight
 */
export default function BodyWeightForm() {
  const [weight, setWeight] = useState('');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Load logs on mount
  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getBodyWeightLog(30);
      setLogs(data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLog = async () => {
    const w = parseFloat(weight);
    if (!w || w <= 0) {
      setError('Enter valid weight');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.logBodyWeight(w);
      setWeight('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      await loadLogs();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data (reverse for chronological order)
  const chartData = [...(logs || [])].reverse();

  return (
    <div>
      <div className="section-label" style={{ marginBottom: 12 }}>Body Weight</div>

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

      {success && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(16, 185, 129, 0.1)',
          color: '#10b981',
          padding: 12,
          borderRadius: 8,
          fontSize: 12,
          marginBottom: 12
        }}>
          <CheckCircle size={16} strokeWidth={1.8} />
          Weight logged!
        </div>
      )}

      {/* Log input */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          type="number"
          placeholder="kg"
          value={weight}
          onChange={e => setWeight(e.target.value)}
          step={0.1}
          min={0}
          style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg)',
            color: 'var(--color-text)',
            fontSize: 14
          }}
        />
        <button
          onClick={handleLog}
          disabled={loading}
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            border: 'none',
            background: 'var(--aura-accent)',
            color: 'var(--text-primary)',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            fontSize: 14,
            opacity: loading ? 0.6 : 1
          }}>
          {loading ? 'Logging...' : 'Log'}
        </button>
      </div>

      {/* Stats */}
      {chartData.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          <div className="glass p-4" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--aura-accent)' }}>
              {chartData[chartData.length - 1].weight_kg}kg
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 4 }}>
              Last logged
            </div>
          </div>
          {chartData.length > 1 && (
            <div className="glass p-4" style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: 18,
                fontWeight: 700,
                color: chartData[0].weight_kg < chartData[chartData.length - 1].weight_kg ? '#ef4444' : '#10b981'
              }}>
                {(chartData[0].weight_kg - chartData[chartData.length - 1].weight_kg).toFixed(1)}kg
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 4 }}>
                Change
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="glass p-4" style={{ marginBottom: 16 }}>
          <ProgressLine
            data={chartData.map((log, i) => ({
              label: i === 0 || i === chartData.length - 1 ? new Date(log.logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
              value: log.weight_kg
            }))}
            title="Weight Trend"
            color="var(--aura-accent)"
          />
        </div>
      )}

      {/* Log history */}
      {chartData.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>
            Log History
          </div>
          {chartData.slice(0, 10).map((log, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '8px 0',
              borderBottom: i < 9 ? '0.5px solid var(--color-border)' : 'none',
              fontSize: 13
            }}>
              <span style={{ color: 'var(--color-text-3)' }}>
                {new Date(log.logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
              </span>
              <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                {log.weight_kg}kg
              </span>
            </div>
          ))}
        </div>
      )}

      {!loading && chartData.length === 0 && (
        <p style={{ color: 'var(--color-text-3)', textAlign: 'center', fontSize: 13 }}>
          Start logging your weight to track progress
        </p>
      )}
    </div>
  );
}
