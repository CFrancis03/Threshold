import { useCallback, useEffect, useSyncExternalStore, type ReactNode, type MouseEvent } from 'react';

/**
 * A hash router in fifty lines.
 *
 * Hash routing means the built site is a single file tree that can be dropped
 * on any static host — GitHub Pages, S3, a USB stick — with no rewrite rules
 * and no server. That is worth more here than the features a router library
 * would add.
 */

export type Route =
  | { name: 'landing' }
  | { name: 'levels' }
  | { name: 'level'; id: number }
  | { name: 'sandbox' }
  | { name: 'how' }
  | { name: 'lab' };

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

function readHash(): string {
  return window.location.hash.replace(/^#/, '') || '/';
}

export function parseRoute(path: string): Route {
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) return { name: 'landing' };
  switch (parts[0]) {
    case 'play': {
      if (parts.length === 1) return { name: 'levels' };
      const id = Number(parts[1]);
      return Number.isInteger(id) && id >= 1 && id <= 7 ? { name: 'level', id } : { name: 'levels' };
    }
    case 'sandbox':
      return { name: 'sandbox' };
    case 'how':
      return { name: 'how' };
    case 'lab':
      return { name: 'lab' };
    default:
      return { name: 'landing' };
  }
}

export function useRoute(): Route {
  const path = useSyncExternalStore(subscribe, readHash, () => '/');
  // Scrolling back to the top on navigation is the one bit of browser
  // behaviour hash routing takes away, so put it back.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [path]);
  return parseRoute(path);
}

export function navigate(path: string) {
  window.location.hash = path;
}

export function href(path: string): string {
  return `#${path}`;
}

interface LinkProps {
  to: string;
  children?: ReactNode;
  className?: string;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
  'aria-current'?: 'page' | undefined;
  'aria-label'?: string;
}

export function Link({ to, children, onClick, ...rest }: LinkProps) {
  const handle = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(e);
    },
    [onClick],
  );
  return (
    <a href={href(to)} onClick={handle} {...rest}>
      {children}
    </a>
  );
}
