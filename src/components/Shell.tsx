import type { ReactNode } from 'react';
import css from './Shell.module.css';
import { Link, type Route } from '../router';
import { LEVEL_COUNT, useProgress } from '../state/useProgress';

/**
 * The single rail across the top of every page: the name, how far you have
 * got, and the two places you can go that are not the game.
 */
export function Shell({ route, children }: { route: Route; children: ReactNode }) {
  const { progress, isUnlocked } = useProgress();
  const currentLevel = route.name === 'level' ? route.id : null;

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to the main content
      </a>
      <header className={css.rail}>
        <Link to="/" className={css.brand} aria-label="Threshold, home">
          {/* A step function: the shape the whole site is about. */}
          <svg className={css.mark} viewBox="0 0 22 14" aria-hidden="true">
            <path d="M1 12 H9.5 V2 H21" />
            <circle cx="9.5" cy="7" r="2.1" />
          </svg>
          Threshold
        </Link>

        <nav className={css.progress} aria-label="Level progress">
          {Array.from({ length: LEVEL_COUNT }, (_, i) => i + 1).map((n) => {
            const done = Boolean(progress.completed[n]);
            const open = isUnlocked(n);
            const state = done ? 'finished' : open ? 'unlocked' : 'locked';
            return (
              <Link
                key={n}
                to={open ? `/play/${n}` : '/play'}
                className={`${css.step} ${done ? css.stepDone : ''} ${n === currentLevel ? css.stepCurrent : ''}`}
                aria-label={`Level ${n}, ${state}`}
                aria-current={n === currentLevel ? 'page' : undefined}
              />
            );
          })}
        </nav>

        <span className={css.spacer} />

        <nav className={css.nav} aria-label="Sections">
          <Link to="/play" aria-current={route.name === 'levels' ? 'page' : undefined}>
            Levels
          </Link>
          <Link to="/sandbox" aria-current={route.name === 'sandbox' ? 'page' : undefined}>
            Sandbox
          </Link>
          <Link to="/how" aria-current={route.name === 'how' ? 'page' : undefined}>
            How it works
          </Link>
        </nav>
      </header>
      <main id="main" className={css.main}>
        {children}
      </main>
    </>
  );
}
