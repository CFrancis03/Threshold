import { describe, expect, it } from 'vitest';
import { AND, NAND, OR, XOR, datasets, makeCircle, makeRing, makeSpiral, makeTwoClusters } from '../datasets';
import { sampleField, fromPixel, toPixel, weightArrow } from '../boundary';
import { createNetwork, setBias, setWeight } from '../network';
import { makeRng } from '../rng';

describe('logic datasets', () => {
  it('cover all four corners in a stable order', () => {
    expect(AND.points.map((p) => p.x)).toEqual([[0, 0], [0, 1], [1, 0], [1, 1]]);
  });

  it('have the truth tables everyone knows', () => {
    expect(AND.points.map((p) => p.y[0])).toEqual([0, 0, 0, 1]);
    expect(OR.points.map((p) => p.y[0])).toEqual([0, 1, 1, 1]);
    expect(NAND.points.map((p) => p.y[0])).toEqual([1, 1, 1, 0]);
    expect(XOR.points.map((p) => p.y[0])).toEqual([0, 1, 1, 0]);
  });

  it('NAND is the exact opposite of AND', () => {
    AND.points.forEach((p, i) => expect(NAND.points[i].y[0]).toBe(1 - p.y[0]));
  });
});

describe('generated datasets', () => {
  it('are reproducible for a given seed', () => {
    expect(makeCircle(5).points).toEqual(makeCircle(5).points);
    expect(makeSpiral(5).points).not.toEqual(makeSpiral(6).points);
  });

  it('stay inside their domain', () => {
    for (const d of [makeCircle(), makeRing(), makeSpiral(), makeTwoClusters()]) {
      for (const p of d.points) {
        expect(p.x[0]).toBeGreaterThanOrEqual(d.domain[0][0]);
        expect(p.x[0]).toBeLessThanOrEqual(d.domain[0][1]);
        expect(p.x[1]).toBeGreaterThanOrEqual(d.domain[1][0]);
        expect(p.x[1]).toBeLessThanOrEqual(d.domain[1][1]);
      }
    }
  });

  it('label the circle by distance from the centre', () => {
    for (const p of makeCircle(3, 60, 0.5).points) {
      expect(p.y[0]).toBe(Math.hypot(p.x[0], p.x[1]) < 0.5 ? 1 : 0);
    }
  });

  it('give both classes a fair share of the points', () => {
    for (const d of [makeCircle(), makeRing(), makeSpiral(), makeTwoClusters()]) {
      const ones = d.points.filter((p) => p.y[0] === 1).length;
      expect(ones / d.points.length).toBeGreaterThan(0.25);
      expect(ones / d.points.length).toBeLessThan(0.75);
    }
  });

  it('exposes every dataset through the registry', () => {
    expect(Object.keys(datasets)).toEqual(['and', 'or', 'nand', 'xor', 'clusters', 'circle', 'ring', 'spiral']);
  });
});

describe('decision boundary sampling', () => {
  const domain: [[number, number], [number, number]] = [[-1, 1], [-1, 1]];

  it('returns a square field normalised to 0..1', () => {
    const field = sampleField(createNetwork([2, 1], { seed: 4 }), { domain, resolution: 16 });
    expect(field).toHaveLength(256);
    expect(Math.min(...field)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...field)).toBeLessThanOrEqual(1);
  });

  it('puts the top of the image at maximum y', () => {
    // A neuron that only looks at y: output rises with y, so row 0 is highest.
    let net = createNetwork([2, 1]);
    net = setWeight(net, 0, 0, 1, 8);
    const res = 8;
    const field = sampleField(net, { domain, resolution: res });
    expect(field[0]).toBeGreaterThan(field[(res - 1) * res]);
  });

  it('reuses a supplied buffer instead of allocating', () => {
    const buffer = new Float32Array(64);
    const out = sampleField(createNetwork([2, 1], { seed: 1 }), { domain, resolution: 8, into: buffer });
    expect(out).toBe(buffer);
  });

  it('can probe a single hidden neuron', () => {
    let net = createNetwork([2, 2, 1]);
    net = setWeight(net, 0, 1, 0, 10);
    net = setBias(net, 0, 1, -1);
    const flat = sampleField(net, { domain, resolution: 8, probe: { layer: 0, neuron: 0 } });
    const sloped = sampleField(net, { domain, resolution: 8, probe: { layer: 0, neuron: 1 } });
    // Neuron 0 was never wired up, so its field is uniform; neuron 1 is not.
    expect(new Set(Array.from(flat)).size).toBe(1);
    expect(new Set(Array.from(sloped)).size).toBeGreaterThan(1);
  });

  it('maps data space to pixels and back', () => {
    const [px, py] = toPixel(0, 0, domain, 200, 200);
    expect(px).toBeCloseTo(100);
    expect(py).toBeCloseTo(100);
    const [x, y] = fromPixel(px, py, domain, 200, 200);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(0);
    expect(toPixel(-1, 1, domain, 200, 200)).toEqual([0, 0]);
  });
});

describe('weight arrow', () => {
  const domain: [[number, number], [number, number]] = [[-1, 1], [-1, 1]];
  const neuron = (w1: number, w2: number, b: number) => {
    let net = createNetwork([2, 1]);
    net = setWeight(net, 0, 0, 0, w1);
    net = setWeight(net, 0, 0, 1, w2);
    return setBias(net, 0, 0, b);
  };

  it('stands on the boundary line', () => {
    for (const [w1, w2, b] of [[3, 2, 0.4], [-1.5, 4, -0.3], [0.5, -6, 0.2], [7, 0.1, -0.5]]) {
      const arrow = weightArrow(neuron(w1, w2, b), domain)!;
      expect(w1 * arrow.from[0] + w2 * arrow.from[1] + b).toBeCloseTo(0, 9);
    }
  });

  it('points the way the weights point, at right angles to the line', () => {
    const w1 = 3;
    const w2 = -2;
    const arrow = weightArrow(neuron(w1, w2, 0.1), domain)!;
    const ax = arrow.to[0] - arrow.from[0];
    const ay = arrow.to[1] - arrow.from[1];
    // Parallel to (w1, w2): the cross product vanishes, the dot product is positive.
    expect(ax * w2 - ay * w1).toBeCloseTo(0, 9);
    expect(ax * w1 + ay * w2).toBeGreaterThan(0);
    // ...and therefore square to the line, whose direction is (-w2, w1).
    expect(ax * -w2 + ay * w1).toBeCloseTo(0, 9);
  });

  it('points at the side that fires', () => {
    const net = neuron(2, 5, -0.7);
    const arrow = weightArrow(net, domain)!;
    const [tx, ty] = arrow.to;
    expect(2 * tx + 5 * ty - 0.7).toBeGreaterThan(0);
  });

  it('follows a steep line that misses the middle of the picture', () => {
    // This line is nowhere near the centre, and only just clips a corner.
    const arrow = weightArrow(neuron(1, 1, -1.8), domain)!;
    expect(arrow).not.toBeNull();
    for (const [x, y] of [arrow.from, arrow.to]) {
      expect(x).toBeGreaterThanOrEqual(-1);
      expect(x).toBeLessThanOrEqual(1);
      expect(y).toBeGreaterThanOrEqual(-1);
      expect(y).toBeLessThanOrEqual(1);
    }
  });

  it('keeps both ends inside the picture whatever the geometry', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const rng = makeRng(seed);
      const net = neuron((rng() - 0.5) * 12, (rng() - 0.5) * 12, (rng() - 0.5) * 3);
      const arrow = weightArrow(net, domain);
      if (!arrow) continue;
      for (const [x, y] of [arrow.from, arrow.to]) {
        expect(x).toBeGreaterThanOrEqual(-1 - 1e-9);
        expect(x).toBeLessThanOrEqual(1 + 1e-9);
        expect(y).toBeGreaterThanOrEqual(-1 - 1e-9);
        expect(y).toBeLessThanOrEqual(1 + 1e-9);
      }
    }
  });

  it('has nothing to draw for an untouched neuron, or a line outside the picture', () => {
    expect(weightArrow(neuron(0, 0, 0), domain)).toBeNull();
    expect(weightArrow(neuron(1, 1, -9), domain)).toBeNull();
  });

  it('only describes a single neuron whose boundary sits at zero', () => {
    expect(weightArrow(createNetwork([2, 2, 1], { seed: 1 }), domain)).toBeNull();
    expect(weightArrow(createNetwork([2, 1], { hidden: 'tanh', seed: 1 }), domain)).toBeNull();
    expect(weightArrow(createNetwork([2, 1], { hidden: 'relu', seed: 1 }), domain)).toBeNull();
  });
});
