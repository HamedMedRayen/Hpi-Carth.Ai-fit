import { useMemo } from 'react';
import { useTheme } from '../utils/theme';

/**
 * Returns computed chart colors that respect the current theme.
 * Re-computes when theme changes so Recharts components get fresh values.
 */
export function useChartColors() {
  return {
    primary:       'var(--aura-accent)',
    accent2:       'var(--aura-accent2)',
    accent3:       'var(--aura-accent3)',
    accent4:       'var(--aura-accent4)',
    text:          'var(--color-text)',
    textMuted:     'var(--color-text-2)',
    textDim:       'var(--color-text-3)',
    surface:       'var(--bg-card)',
    border:        'var(--border-card)',
    grid:          'var(--border-card)',
    tick:          'var(--color-text-3)',
    tooltipBg:     'var(--color-bg3)',
    tooltipBorder: 'var(--border-card)',
    bgInput:       'var(--bg-input)',
    chartLine:     'var(--chart-line-primary)',
    chartLine2:    'var(--chart-line-secondary)',
    areaFill:      'var(--chart-area-fill)',
    barFill:       'var(--bar-fill)',
    overlay:       'var(--overlay-bg)',
  };
}
