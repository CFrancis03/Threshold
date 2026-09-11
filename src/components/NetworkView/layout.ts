import type { Network } from '../../nn/types';

/**
 * Turning a network into geometry.
 *
 * Pure and separately testable: given a network, where does every neuron and
 * every edge sit? The component does no arithmetic of its own beyond this.
 *
 * Columns are counted from the inputs: column 0 holds the input values, and
 * column c (for c > 0) holds `net.layers[c - 1]`. An edge between columns c and
 * c + 1 therefore belongs to layer c.
 */

export interface NodeGeom {
  key: string;
  /** 0 for the input column. */
  column: number;
  index: number;
  x: number;
  y: number;
  r: number;
  kind: 'input' | 'hidden' | 'output';
  /** Layer index into `net.layers`, or -1 for inputs. */
  layer: number;
}

export interface EdgeGeom {
  key: string;
  layer: number;
  to: number;
  from: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /**
   * Where the weight label sits: a third of the way along, not the midpoint.
   * Crossing edges share a midpoint exactly, so midpoint labels would stack on
   * top of each other; a third of the way along they fan out cleanly.
   */
  lx: number;
  ly: number;
}

export interface NetLayout {
  width: number;
  height: number;
  nodes: NodeGeom[];
  edges: EdgeGeom[];
  columnX: number[];
  radius: number;
}

export interface LayoutOptions {
  width?: number;
  /** Horizontal room reserved for the input and output labels. */
  padX?: number;
  padY?: number;
  /** Vertical gap between neuron edges within a column. */
  gap?: number;
  maxRadius?: number;
  /**
   * Width of the widest text sitting outside the first and last columns.
   * The padding has to clear the neuron's radius as well, and the radius is
   * only known once the layout has been worked out — so the caller passes the
   * text width and this function does the arithmetic.
   */
  labelRoom?: number;
}

const LABEL_T = 0.33;

/** Space between a neuron's rim and its name. Matches NetworkView. */
export const LABEL_GAP = 10;

export function layoutNetwork(net: Network, opts: LayoutOptions = {}): NetLayout {
  const { width = 720, padY = 26, gap = 26, maxRadius = 21, labelRoom = 0 } = opts;

  const counts = [net.inputSize, ...net.layers.map((l) => l.biases.length)];
  const columns = counts.length;
  const tallest = Math.max(...counts);

  // Shrink the neurons rather than the canvas when a column gets crowded.
  const radius = Math.max(11, Math.min(maxRadius, (300 - (tallest - 1) * gap) / (2 * tallest)));
  const height = Math.max(158, tallest * radius * 2 + (tallest - 1) * gap + padY * 2);

  // Now that the radius is known, make sure the outer columns sit far enough
  // in for their labels to fit beside them.
  const padX = Math.min(width * 0.32, Math.max(opts.padX ?? 62, radius + LABEL_GAP + labelRoom));

  const columnX: number[] = [];
  const span = width - padX * 2;
  for (let c = 0; c < columns; c++) {
    columnX.push(columns === 1 ? width / 2 : padX + (span * c) / (columns - 1));
  }

  const nodes: NodeGeom[] = [];
  for (let c = 0; c < columns; c++) {
    const count = counts[c];
    const block = count * radius * 2 + (count - 1) * gap;
    const top = (height - block) / 2 + radius;
    for (let i = 0; i < count; i++) {
      nodes.push({
        key: `n-${c}-${i}`,
        column: c,
        index: i,
        layer: c - 1,
        x: columnX[c],
        y: top + i * (radius * 2 + gap),
        r: radius,
        kind: c === 0 ? 'input' : c === columns - 1 ? 'output' : 'hidden',
      });
    }
  }

  const at = (column: number, index: number) => nodes.find((n) => n.column === column && n.index === index)!;

  const edges: EdgeGeom[] = [];
  for (let l = 0; l < net.layers.length; l++) {
    const layer = net.layers[l];
    for (let to = 0; to < layer.biases.length; to++) {
      for (let from = 0; from < layer.weights[to].length; from++) {
        const a = at(l, from);
        const b = at(l + 1, to);
        // Stop the line at the rim of each neuron rather than its centre, so a
        // thick edge never bleeds into the fill.
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        const x1 = a.x + ux * (a.r + 1);
        const y1 = a.y + uy * (a.r + 1);
        const x2 = b.x - ux * (b.r + 1);
        const y2 = b.y - uy * (b.r + 1);
        edges.push({
          key: `e-${l}-${to}-${from}`,
          layer: l,
          to,
          from,
          x1,
          y1,
          x2,
          y2,
          lx: x1 + (x2 - x1) * LABEL_T,
          ly: y1 + (y2 - y1) * LABEL_T,
        });
      }
    }
  }

  return { width, height, nodes, edges, columnX, radius };
}

/**
 * An arc starting at 12 o'clock, used to draw a neuron's bias as a ring around
 * it. A positive bias sweeps clockwise, a negative one anticlockwise, so the
 * direction carries the sign as well as the colour does.
 */
export function arcPath(cx: number, cy: number, r: number, sweepDegrees: number): string {
  const clamped = Math.max(-350, Math.min(350, sweepDegrees));
  if (Math.abs(clamped) < 0.6) return '';
  const start = -90;
  const end = start + clamped;
  const toXY = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };
  const [sx, sy] = toXY(start);
  const [ex, ey] = toXY(end);
  const largeArc = Math.abs(clamped) > 180 ? 1 : 0;
  const sweepFlag = clamped > 0 ? 1 : 0;
  return `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${r} ${r} 0 ${largeArc} ${sweepFlag} ${ex.toFixed(2)} ${ey.toFixed(2)}`;
}

/** Edge thickness from weight magnitude. Caps so one huge weight cannot swamp the drawing. */
export function strokeWidthForWeight(weight: number, cap = 5): number {
  const t = Math.min(1, Math.abs(weight) / cap);
  return 0.9 + t * 6.6;
}
