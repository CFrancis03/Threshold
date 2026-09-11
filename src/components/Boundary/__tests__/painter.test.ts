import { describe, expect, it } from 'vitest';
import { contourSegments } from '../painter';

/** Build a res x res field from a function of normalised x, y. */
function makeField(res: number, fn: (x: number, y: number) => number): Float32Array {
  const f = new Float32Array(res * res);
  for (let r = 0; r < res; r++) {
    for (let c = 0; c < res; c++) {
      f[r * res + c] = fn(c / (res - 1), r / (res - 1));
    }
  }
  return f;
}

describe('contourSegments', () => {
  it('finds nothing in a field that never crosses the threshold', () => {
    expect(contourSegments(makeField(16, () => 0.9), 16)).toHaveLength(0);
    expect(contourSegments(makeField(16, () => 0.1), 16)).toHaveLength(0);
  });

  it('finds a straight vertical line where a field crosses halfway across', () => {
    const res = 32;
    const segments = contourSegments(makeField(res, (x) => x), res);
    expect(segments.length).toBeGreaterThan(0);
    // Every crossing should sit at the middle column, within one cell.
    for (let i = 0; i < segments.length; i += 2) {
      expect(Math.abs(segments[i] - (res - 1) / 2)).toBeLessThan(1.01);
    }
  });

  it('interpolates between cells rather than snapping to the grid', () => {
    const res = 9;
    // 0.9x + 0.1 reaches 0.5 at x = 4/9, which falls between columns 3 and 4.
    const segments = contourSegments(makeField(res, (x) => x * 0.9 + 0.1), res);
    expect(segments.length).toBeGreaterThan(0);
    const xs = segments.filter((_, i) => i % 2 === 0);
    const expected = (4 / 9) * (res - 1);
    for (const x of xs) expect(x).toBeCloseTo(expected, 6);
    expect(Math.abs(expected - Math.round(expected))).toBeGreaterThan(0.05);
  });

  it('closes a ring around a circular region', () => {
    const res = 48;
    const segments = contourSegments(makeField(res, (x, y) => (Math.hypot(x - 0.5, y - 0.5) < 0.3 ? 1 : 0)), res);
    // A closed loop: every point should be about the same distance from the
    // centre of the field.
    const centre = (res - 1) / 2;
    const radii: number[] = [];
    for (let i = 0; i < segments.length; i += 2) {
      radii.push(Math.hypot(segments[i] - centre, segments[i + 1] - centre));
    }
    expect(radii.length).toBeGreaterThan(20);
    const min = Math.min(...radii);
    const max = Math.max(...radii);
    expect(max - min).toBeLessThan(res * 0.1);
  });

  it('emits two strands through a saddle cell', () => {
    // A 2x2 field with the high corners on one diagonal.
    const f = new Float32Array([1, 0, 0, 1]);
    expect(contourSegments(f, 2)).toHaveLength(8);
  });

  it('survives a flat cell without dividing by zero', () => {
    const f = new Float32Array([0.5, 0.5, 0.5, 0]);
    const segments = contourSegments(f, 2);
    expect(segments.every((v) => Number.isFinite(v))).toBe(true);
  });
});
