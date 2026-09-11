import { describe, expect, it } from 'vitest';
import { AND, NAND, OR, XOR, datasets, makeCircle, makeRing, makeSpiral, makeTwoClusters } from '../datasets';
import { sampleField, fromPixel, toPixel } from '../boundary';
import { createNetwork, setBias, setWeight } from '../network';

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
