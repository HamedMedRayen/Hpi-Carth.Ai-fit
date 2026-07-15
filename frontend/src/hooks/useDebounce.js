import { useRef, useCallback } from "react";

/**
 * useDebounce — returns a debounced version of the callback.
 * Usage:
 *   const debouncedSearch = useDebounce((query) => api.search(query), 300);
 *   onChange={(e) => debouncedSearch(e.target.value)}
 */
export function useDebounce(callback, delay = 300) {
  const timerRef = useRef(null);

  return useCallback((...args) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
}

/**
 * debounce — standalone utility (for non-hook usage).
 */
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export default useDebounce;
