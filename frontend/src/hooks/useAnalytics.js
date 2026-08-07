import { useState, useEffect, useCallback } from "react";
import { api } from "../utils/api";

export function useDashboard() {
  const [data, setData]     = useState(null);
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dash, userStats] = await Promise.all([api.getDashboard(), api.getUserStats()]);
      setData(dash); setStats(userStats); setError(null);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  return { data, stats, loading, error, reload: load };
}



export function useVolume() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.getVolume().then(setData).finally(() => setLoading(false));
  }, []);
  return { data, loading };
}

export function useExerciseProgress(exerciseName) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!exerciseName) return;
    setLoading(true);
    api.getExerciseProgress(exerciseName)
      .then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, [exerciseName]);
  return { data, loading };
}
