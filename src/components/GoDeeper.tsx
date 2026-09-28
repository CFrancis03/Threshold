import type { ReactNode } from 'react';
import css from './GoDeeper.module.css';

export interface GoDeeperProps {
  title: string;
  children: ReactNode;
}

/**
 * Optional depth, closed until asked for.
 *
 * A native <details>, so it is announced properly, opens from the keyboard,
 * and needs no state of its own.
 */
export function GoDeeper({ title, children }: GoDeeperProps) {
  return (
    <details className={css.deeper}>
      <summary className={css.summary}>
        <span className={css.label}>Go deeper</span>
        <span className={css.title}>{title}</span>
      </summary>
      <div className={css.body}>{children}</div>
    </details>
  );
}
