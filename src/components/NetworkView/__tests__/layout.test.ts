import { describe, expect, it } from 'vitest';
import { arcPath, LABEL_GAP, layoutNetwork, strokeWidthForWeight } from '../layout';
import { createNetwork } from '../../../nn/network';

describe('layoutNetwork', () => {
  it('makes one node per input and per neuron', () => {
    const l = layoutNetwork(createNetwork([2, 3, 1]));
    expect(l.nodes).toHaveLength(6);
    expect(l.nodes.filter((n) => n.kind === 'input')).toHaveLength(2);
    expect(l.nodes.filter((n) => n.kind === 'hidden')).toHaveLength(3);
    expect(l.nodes.filter((n) => n.kind === 'output')).toHaveLength(1);
  });

  it('makes one edge per weight and addresses it correctly', () => {
    const net = createNetwork([2, 3, 1]);
    const l = layoutNetwork(net);
    expect(l.edges).toHaveLength(2 * 3 + 3 * 1);
    for (const e of l.edges) {
      expect(net.layers[e.layer].weights[e.to][e.from]).toBeDefined();
    }
  });

  it('puts the columns in order from left to right', () => {
    const l = layoutNetwork(createNetwork([2, 4, 3, 1]));
    expect(l.columnX).toHaveLength(4);
    for (let i = 1; i < l.columnX.length; i++) {
      expect(l.columnX[i]).toBeGreaterThan(l.columnX[i - 1]);
    }
  });

  it('centres each column vertically', () => {
    const l = layoutNetwork(createNetwork([1, 4, 1]));
    for (const column of [0, 1, 2]) {
      const ys = l.nodes.filter((n) => n.column === column).map((n) => n.y);
      const middle = (Math.min(...ys) + Math.max(...ys)) / 2;
      expect(middle).toBeCloseTo(l.height / 2, 6);
    }
  });

  it('shrinks the neurons rather than the canvas when a column is crowded', () => {
    const small = layoutNetwork(createNetwork([2, 2, 1]));
    const big = layoutNetwork(createNetwork([2, 8, 1]));
    expect(big.radius).toBeLessThan(small.radius);
    expect(big.radius).toBeGreaterThanOrEqual(11);
  });

  it('never lets two neurons in a column overlap', () => {
    for (const shape of [[2, 8, 1], [3, 6, 6, 2], [2, 4, 3, 1]]) {
      const l = layoutNetwork(createNetwork(shape));
      for (let c = 0; c < shape.length; c++) {
        const ys = l.nodes
          .filter((n) => n.column === c)
          .map((n) => n.y)
          .sort((a, b) => a - b);
        for (let i = 1; i < ys.length; i++) {
          expect(ys[i] - ys[i - 1]).toBeGreaterThanOrEqual(l.radius * 2);
        }
      }
    }
  });

  it('starts and ends edges at the rim, not the centre', () => {
    const l = layoutNetwork(createNetwork([2, 2, 1]));
    for (const e of l.edges) {
      const source = l.nodes.find((n) => n.column === e.layer && n.index === e.from)!;
      expect(Math.hypot(e.x1 - source.x, e.y1 - source.y)).toBeGreaterThan(source.r);
    }
  });

  it('gives crossing edges different label positions', () => {
    // The two diagonals of a 2 -> 2 layer cross at exactly the midpoint, which
    // is why labels do not sit there.
    const l = layoutNetwork(createNetwork([2, 2, 1]));
    const diagonals = l.edges.filter((e) => e.layer === 0 && e.to !== e.from);
    expect(diagonals).toHaveLength(2);
    expect(Math.abs(diagonals[0].ly - diagonals[1].ly)).toBeGreaterThan(8);
  });

  it('keeps everything inside the viewBox', () => {
    const l = layoutNetwork(createNetwork([2, 6, 4, 2]), { width: 640 });
    for (const n of l.nodes) {
      expect(n.x - n.r).toBeGreaterThanOrEqual(0);
      expect(n.x + n.r).toBeLessThanOrEqual(640);
      expect(n.y - n.r).toBeGreaterThanOrEqual(0);
      expect(n.y + n.r).toBeLessThanOrEqual(l.height);
    }
  });
});

describe('weight and bias encodings', () => {
  it('thickness grows with magnitude and then caps', () => {
    expect(strokeWidthForWeight(0)).toBeLessThan(strokeWidthForWeight(1));
    expect(strokeWidthForWeight(1)).toBeLessThan(strokeWidthForWeight(4));
    expect(strokeWidthForWeight(5)).toBeCloseTo(strokeWidthForWeight(50), 6);
    // Sign is carried by colour and dashes, never by thickness.
    expect(strokeWidthForWeight(-3)).toBeCloseTo(strokeWidthForWeight(3), 6);
  });

  it('draws the bias arc clockwise for positive and anticlockwise for negative', () => {
    expect(arcPath(50, 50, 20, 90)).toContain(' 1 ');
    expect(arcPath(50, 50, 20, -90)).toContain(' 0 ');
    expect(arcPath(50, 50, 20, 0)).toBe('');
  });

  it('sets the large-arc flag past half a turn', () => {
    expect(arcPath(0, 0, 10, 90).split(' ')[7]).toBe('0');
    expect(arcPath(0, 0, 10, 270).split(' ')[7]).toBe('1');
  });
});

describe('label room', () => {
  it('pushes the outer columns in far enough for their names to fit', () => {
    // "input 1" beside a 30px neuron needs the first column at least
    // 30 + gap + text away from the edge, or the name hangs off the drawing.
    const labelRoom = 46;
    const l = layoutNetwork(createNetwork([2, 1]), { width: 600, maxRadius: 30, labelRoom });
    const first = l.nodes.find((n) => n.column === 0)!;
    const last = l.nodes.find((n) => n.column === 1)!;
    expect(first.x - first.r - LABEL_GAP - labelRoom).toBeGreaterThanOrEqual(0);
    expect(last.x + last.r + LABEL_GAP + labelRoom).toBeLessThanOrEqual(600);
  });

  it('does not let the padding eat the whole drawing on a narrow canvas', () => {
    const l = layoutNetwork(createNetwork([2, 2, 1]), { width: 300, labelRoom: 400 });
    expect(l.columnX[0]).toBeLessThanOrEqual(300 * 0.32);
    expect(l.columnX[l.columnX.length - 1]).toBeGreaterThan(l.columnX[0]);
  });
});
