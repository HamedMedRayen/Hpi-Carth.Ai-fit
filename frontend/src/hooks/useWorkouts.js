import { useState, useEffect, useCallback } from "react";
import { api } from "../utils/api";

export function useWorkouts() {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const load = useCallback(async () => {
    setLoading(true);
    try { setWorkouts(await api.getWorkouts(100)); setError(null); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  return { workouts, loading, error, reload: load };
}

export function useWorkoutDetail(id) {
  const [workout, setWorkout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.getWorkout(id)
      .then(d => { setWorkout(d); setError(null); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);
  return { workout, loading, error };
}

export function usePRs() {
  const [prs, setPRs] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.getPRs().then(setPRs).finally(() => setLoading(false));
  }, []);
  return { prs, loading };
}

export function useHeatmap() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.getHeatmap().then(setData).finally(() => setLoading(false));
  }, []);
  return { data, loading };
}
