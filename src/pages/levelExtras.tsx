import type { ComponentType } from 'react';
import { FourDemands } from '../components/FourDemands';
import { HiddenSpace } from '../components/HiddenSpace';
import { deeper, type Deeper } from '../content/deeper';
import type { Dataset } from '../nn/datasets';
import type { Network } from '../nn/types';

/**
 * The teaching that sits alongside a level rather than inside its definition.
 *
 * `game/` stays plain data with no React in it, so anything that is an
 * interactive explanation — not a puzzle rule — lives here, keyed by level.
 */

export interface WallProps {
  net: Network;
  onChange: (next: Network) => void;
}

export interface PeekProps {
  net: Network;
  dataset: Dataset;
}

export interface LevelExtras {
  /**
   * The argument for why the player is stuck, offered once they have hit the
   * wall. Comes with the escape hatch, which it is deliberately not forced in
   * front of.
   */
  Wall?: ComponentType<WallProps>;
  /** A live second view of the network, shown while it applies. */
  Peek?: ComponentType<PeekProps>;
  /** A switch under the boundary picture that draws which way the weights point. */
  arrowToggle?: string;
  /** The optional layer of explanation under the level. */
  deeper?: Deeper;
}

const own: Record<number, Omit<LevelExtras, 'deeper'>> = {
  3: { arrowToggle: 'Show which way the weights point' },
  4: { Wall: FourDemands, Peek: HiddenSpace },
};

/** Every level has depth notes; a few also have interactive extras of their own. */
export const extras: Record<number, LevelExtras> = Object.fromEntries(
  Array.from({ length: 7 }, (_, i) => i + 1).map((id) => [id, { ...own[id], deeper: deeper[id] }]),
);
