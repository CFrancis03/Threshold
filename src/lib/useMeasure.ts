import { useLayoutEffect, useRef, useState } from 'react';

/**
 * The rendered width of an element.
 *
 * The network diagram uses this to draw at 1:1 — one SVG unit per CSS pixel —
 * rather than drawing at a fixed size and letting the browser scale it down.
 * Scaling would shrink the touch targets along with everything else, which is
 * how a diagram that is fine on a laptop becomes unusable on a phone.
 */
export function useMeasuredWidth<T extends HTMLElement>(fallback = 720) {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(fallback);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width ?? 0;
      // Ignore sub-pixel jitter, which would otherwise relayout every frame.
      setWidth((prev) => (Math.abs(prev - next) > 1 && next > 0 ? next : prev));
    });
    observer.observe(el);
    setWidth(el.getBoundingClientRect().width || fallback);
    return () => observer.disconnect();
  }, [fallback]);

  return [ref, width] as const;
}
