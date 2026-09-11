import { useCallback, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { clamp, quantize } from '../../lib/format';

/**
 * Direct manipulation of one number, by drag or by keyboard.
 *
 * Dragging is vertical only: up is more, down is less, the same gesture for a
 * weight on an edge and a bias on a neuron. Holding Shift slows it to a
 * quarter speed for fine work. Everything is equally reachable from the
 * keyboard, which is why the same hook owns both.
 */

export interface DragValueOptions {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  /** Units of value per pixel of vertical travel. */
  sensitivity?: number;
  /** Arrow key increment. */
  step?: number;
  /** Shift + arrow increment. */
  bigStep?: number;
  disabled?: boolean;
  /** A press that never became a drag: open the inspector. */
  onActivate?: () => void;
  /** Fired once when a drag starts and once when it ends. */
  onDragChange?: (dragging: boolean) => void;
}

const DRAG_THRESHOLD = 3;

export function useDragValue({
  value,
  onChange,
  min = -8,
  max = 8,
  sensitivity = 0.02,
  step = 0.1,
  bigStep = 0.5,
  disabled = false,
  onActivate,
  onDragChange,
}: DragValueOptions) {
  const [dragging, setDragging] = useState(false);
  const start = useRef({ y: 0, value: 0, moved: false });

  const onPointerDown = useCallback(
    (e: PointerEvent<SVGElement | HTMLElement>) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      start.current = { y: e.clientY, value, moved: false };
      if (disabled) return;
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      setDragging(true);
      onDragChange?.(true);
    },
    [value, disabled, onDragChange],
  );

  const onPointerMove = useCallback(
    (e: PointerEvent<SVGElement | HTMLElement>) => {
      if (!dragging || disabled) return;
      const dy = start.current.y - e.clientY;
      if (Math.abs(dy) > DRAG_THRESHOLD) start.current.moved = true;
      const scale = e.shiftKey ? 0.25 : 1;
      const next = clamp(quantize(start.current.value + dy * sensitivity * scale, 0.01), min, max);
      onChange(next);
    },
    [dragging, disabled, sensitivity, min, max, onChange],
  );

  const finish = useCallback(
    (e: PointerEvent<SVGElement | HTMLElement>) => {
      if (dragging) {
        (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
        setDragging(false);
        onDragChange?.(false);
      }
      // A tap, not a drag — treat it as "tell me about this one".
      if (!start.current.moved) onActivate?.();
    },
    [dragging, onActivate, onDragChange],
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent<SVGElement | HTMLElement>) => {
      const nudge = e.shiftKey ? bigStep : step;
      let next: number | null = null;
      switch (e.key) {
        case 'ArrowUp':
        case 'ArrowRight':
          next = value + nudge;
          break;
        case 'ArrowDown':
        case 'ArrowLeft':
          next = value - nudge;
          break;
        case 'PageUp':
          next = value + bigStep * 2;
          break;
        case 'PageDown':
          next = value - bigStep * 2;
          break;
        case 'Home':
          next = 0;
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          onActivate?.();
          return;
        default:
          return;
      }
      e.preventDefault();
      if (disabled) return;
      onChange(clamp(quantize(next, 0.01), min, max));
    },
    [value, step, bigStep, min, max, disabled, onChange, onActivate],
  );

  return {
    dragging,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finish,
      onPointerCancel: finish,
      onKeyDown,
    },
  };
}
