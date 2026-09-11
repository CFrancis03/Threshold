import { useEffect, useState } from 'react';

/**
 * Whether the visitor has asked for less movement.
 *
 * Used to skip the signal pulse and to jump animated values straight to their
 * final state rather than easing to it.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (!window.matchMedia) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

/** True when the viewport is narrow enough that the inspector becomes a sheet. */
export function useIsNarrow(maxWidth = 860): boolean {
  const [narrow, setNarrow] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(`(max-width: ${maxWidth}px)`).matches;
  });

  useEffect(() => {
    if (!window.matchMedia) return;
    const query = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const onChange = () => setNarrow(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [maxWidth]);

  return narrow;
}
