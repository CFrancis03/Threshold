import { makeRng, shuffle, uniform } from './rng';
import type { Sample } from './types';

/**
 * The problems the player is asked to solve.
 *
 * Two families: the four logic gates (which live on the corners of a unit
 * square) and generated 2-D point clouds (which fill the square from -1 to 1).
 */

export interface Dataset {
  id: string;
  /** Short name shown in the UI. */
  label: string;
  points: Sample[];
  /** [[xMin, xMax], [yMin, yMax]] — the window the heatmap paints. */
  domain: [[number, number], [number, number]];
  /** Logic gates get a truth table; clouds get a scatter plot. */
  kind: 'logic' | 'cloud';
}

const LOGIC_DOMAIN: [[number, number], [number, number]] = [
  [-0.4, 1.4],
  [-0.4, 1.4],
];
const CLOUD_DOMAIN: [[number, number], [number, number]] = [
  [-1, 1],
  [-1, 1],
];

const CORNERS: number[][] = [
  [0, 0],
  [0, 1],
  [1, 0],
  [1, 1],
];

function logic(id: string, label: string, outputs: number[]): Dataset {
  return {
    id,
    label,
    kind: 'logic',
    domain: LOGIC_DOMAIN,
    points: CORNERS.map((x, i) => ({ x, y: [outputs[i]] })),
  };
}

export const AND = logic('and', 'AND', [0, 0, 0, 1]);
export const OR = logic('or', 'OR', [0, 1, 1, 1]);
export const NAND = logic('nand', 'NAND', [1, 1, 1, 0]);
export const XOR = logic('xor', 'XOR', [0, 1, 1, 0]);

/** Two roughly round clusters, separable by a single straight line. */
export function makeTwoClusters(seed = 7, perClass = 24): Dataset {
  const rng = makeRng(seed);
  const points: Sample[] = [];
  const centres: Array<[number, number, number]> = [
    [-0.45, -0.35, 0],
    [0.45, 0.4, 1],
  ];
  for (const [cx, cy, label] of centres) {
    for (let i = 0; i < perClass; i++) {
      const angle = rng() * Math.PI * 2;
      const radius = Math.sqrt(rng()) * 0.34;
      points.push({ x: [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius], y: [label] });
    }
  }
  return { id: 'clusters', label: 'Two clusters', kind: 'cloud', domain: CLOUD_DOMAIN, points: shuffle(points, rng) };
}

/** Inside the circle is 1, outside is 0. Impossible with one straight line. */
export function makeCircle(seed = 11, count = 90, radius = 0.5): Dataset {
  const rng = makeRng(seed);
  const points: Sample[] = [];
  while (points.length < count) {
    const x = uniform(rng, -0.92, 0.92);
    const y = uniform(rng, -0.92, 0.92);
    const d = Math.hypot(x, y);
    // Leave a small gap either side of the boundary so the target is legible.
    if (Math.abs(d - radius) < 0.1) continue;
    points.push({ x: [x, y], y: [d < radius ? 1 : 0] });
  }
  return { id: 'circle', label: 'Inside the circle', kind: 'cloud', domain: CLOUD_DOMAIN, points };
}

/** A ring: 1 inside the band, 0 both in the middle and outside. */
export function makeRing(seed = 13, count = 120): Dataset {
  const rng = makeRng(seed);
  const points: Sample[] = [];
  while (points.length < count) {
    const x = uniform(rng, -0.9, 0.9);
    const y = uniform(rng, -0.9, 0.9);
    const d = Math.hypot(x, y);
    if (Math.abs(d - 0.3) < 0.06 || Math.abs(d - 0.72) < 0.06) continue;
    points.push({ x: [x, y], y: [d > 0.3 && d < 0.72 ? 1 : 0] });
  }
  return { id: 'ring', label: 'Ring', kind: 'cloud', domain: CLOUD_DOMAIN, points };
}

/** Two interleaved spiral arms — the classic "you will need training" dataset. */
export function makeSpiral(seed = 17, perArm = 55, noise = 0.045): Dataset {
  const rng = makeRng(seed);
  const points: Sample[] = [];
  for (let arm = 0; arm < 2; arm++) {
    for (let i = 0; i < perArm; i++) {
      const t = (i / perArm) * 2.6 + 0.35;
      const angle = t * 2.1 + arm * Math.PI;
      const r = t * 0.34;
      points.push({
        x: [
          r * Math.cos(angle) + uniform(rng, -noise, noise),
          r * Math.sin(angle) + uniform(rng, -noise, noise),
        ],
        y: [arm],
      });
    }
  }
  return { id: 'spiral', label: 'Two spirals', kind: 'cloud', domain: CLOUD_DOMAIN, points: shuffle(points, rng) };
}

/** An empty canvas the player fills by clicking, used in the sandbox. */
export function makeCustom(points: Sample[] = []): Dataset {
  return { id: 'custom', label: 'Your own points', kind: 'cloud', domain: CLOUD_DOMAIN, points };
}

export const datasets = {
  and: AND,
  or: OR,
  nand: NAND,
  xor: XOR,
  clusters: makeTwoClusters(),
  circle: makeCircle(),
  ring: makeRing(),
  spiral: makeSpiral(),
};

export type DatasetId = keyof typeof datasets;
