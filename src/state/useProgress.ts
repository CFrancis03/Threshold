import { useCallback, useEffect, useState } from 'react';

/**
 * Level progress, kept in localStorage.
 *
 * Nothing leaves the browser. If storage is unavailable — private mode, a
 * locked-down browser — the game still plays, it just forgets between visits.
 */

const KEY = 'threshold.progress.v1';
export const LEVEL_COUNT = 7;

export interface Progress {
  /** Level id -> confidence pips earned, 1 to 3. */
  completed: Record<number, number>;
  /** True once level 7 has been finished, which unlocks the sandbox. */
  sandboxUnlocked: boolean;
}

const EMPTY: Progress = { completed: {}, sandboxUnlocked: false };

function read(): Progress {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<Progress>;
    return {
      completed: parsed.completed ?? {},
      sandboxUnlocked: Boolean(parsed.sandboxUnlocked),
    };
  } catch {
    return EMPTY;
  }
}

function write(p: Progress) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // Storage is full or blocked. Losing progress is not worth an error.
  }
}

// A module-level listener set keeps every component showing the same progress
// without a context provider.
const listeners = new Set<() => void>();
let cached: Progress | null = null;

function current(): Progress {
  if (!cached) cached = read();
  return cached;
}

function update(next: Progress) {
  cached = next;
  write(next);
  listeners.forEach((fn) => fn());
}

export function useProgress() {
  const [, force] = useState(0);

  useEffect(() => {
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);

  const progress = current();

  const complete = useCallback((level: number, pips: number) => {
    const prev = current();
    const best = Math.max(prev.completed[level] ?? 0, pips);
    update({
      completed: { ...prev.completed, [level]: best },
      sandboxUnlocked: prev.sandboxUnlocked || level >= LEVEL_COUNT,
    });
  }, []);

  const resetAll = useCallback(() => update(EMPTY), []);

  /** Level 1 is always open; after that you need the level before it. */
  const isUnlocked = useCallback(
    (level: number) => level === 1 || Boolean(progress.completed[level - 1]),
    [progress],
  );

  const furthestUnlocked = (() => {
    let n = 1;
    while (n < LEVEL_COUNT && progress.completed[n]) n++;
    return n;
  })();

  return { progress, complete, resetAll, isUnlocked, furthestUnlocked };
}
