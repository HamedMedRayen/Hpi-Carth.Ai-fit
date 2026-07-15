import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './auth';
import { api } from './api';

export function useUnits() {
  const { user } = useAuth();
  const [units, setUnits] = useState({
    weight: 'kg',
    height: 'cm'
  });

  useEffect(() => {
    if (user) {
      setUnits({
        weight: user.unit_weight || 'kg',
        height: user.unit_height || 'cm'
      });
    }
  }, [user]);

  const formatWeight = useCallback((val) => {
    if (val === null || val === undefined || val === '') return '—';
    return `${Math.round(val)} ${units.weight}`;
  }, [units.weight]);

  const convertWeight = useCallback((val, to) => {
    if (!val) return 0;
    if (to === 'lb') return val * 2.20462;
    if (to === 'kg') return val / 2.20462;
    return val;
  }, []);

  return {
    units,
    formatWeight,
    convertWeight
  };
}
