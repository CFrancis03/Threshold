import { describe, expect, it } from 'vitest';
import {
  BOWL_BOTTOM,
  START_WEIGHT,
  behaviourFor,
  loss1d,
  measuredSlope,
  runDescent,
  slope1d,
  stepOnce,
  type Behaviour,
} from '../descent1d';

const distance = (w: number) => Math.abs(w - BOWL_BOTTOM);

describe('the one-weight bowl', () => {
  it('bottoms out at the best weight', () => {
    expect(loss1d(BOWL_BOTTOM)).toBe(0);
    expect(loss1d(BOWL_BOTTOM + 1)).toBeGreaterThan(0);
    expect(loss1d(BOWL_BOTTOM - 1)).toBeCloseTo(loss1d(BOWL_BOTTOM + 1), 12);
  });

  it('has a slope that points uphill: negative left of the bottom, positive right of it', () => {
    expect(slope1d(BOWL_BOTTOM - 1)).toBeLessThan(0);
    expect(slope1d(BOWL_BOTTOM + 1)).toBeGreaterThan(0);
    expect(slope1d(BOWL_BOTTOM)).toBe(0);
  });

  it('measures the same slope by nudging as calculus gives, with no calculus involved', () => {
    for (const w of [-3, -0.6, 0, 1.2, 2, 3.7, 9]) {
      expect(measuredSlope(w)).toBeCloseTo(slope1d(w), 5);
    }
  });
});

describe('what the learning rate does', () => {
  it('half the slope lands on the bottom in a single step, from anywhere', () => {
    for (const start of [-4, START_WEIGHT, 0.3, 3.9, 11]) {
      expect(stepOnce(start, 0.5)).toBeCloseTo(BOWL_BOTTOM, 12);
    }
  });

  it('a small rate creeps in from one side and never crosses', () => {
    const { path } = runDescent(START_WEIGHT, 0.05, 40);
    expect(path.every((w) => w < BOWL_BOTTOM)).toBe(true);
    // ...shrinking the distance by the same factor every time: 1 - 2·0.05.
    for (let i = 1; i < path.length; i++) {
      expect(distance(path[i]) / distance(path[i - 1])).toBeCloseTo(0.9, 9);
    }
  });

  it('a rate over one half overshoots to the far side each time, by less each time', () => {
    const { path } = runDescent(START_WEIGHT, 0.8, 12);
    for (let i = 1; i < path.length; i++) {
      // Alternates side...
      expect(Math.sign(path[i] - BOWL_BOTTOM)).toBe(-Math.sign(path[i - 1] - BOWL_BOTTOM));
      // ...and shrinks by |1 - 1.6| = 0.6.
      expect(distance(path[i]) / distance(path[i - 1])).toBeCloseTo(0.6, 9);
    }
  });

  it('a rate of exactly one bounces between the same two spots for ever', () => {
    const { path } = runDescent(START_WEIGHT, 1, 10);
    for (const w of path) expect(distance(w)).toBeCloseTo(distance(START_WEIGHT), 9);
    expect(path[2]).toBeCloseTo(path[0], 9);
  });

  it('a rate past one lands further away every time, and flies off', () => {
    const { path } = runDescent(START_WEIGHT, 1.1, 12);
    for (let i = 1; i < path.length; i++) {
      expect(distance(path[i]) / distance(path[i - 1])).toBeCloseTo(1.2, 9);
    }
    expect(runDescent(START_WEIGHT, 1.2, 500).flewOff).toBe(true);
    expect(runDescent(START_WEIGHT, 0.3, 500).flewOff).toBe(false);
  });
});

/** What actually happens over twenty steps, judged without looking at the label. */
function observed(learningRate: number): Behaviour {
  const { path } = runDescent(START_WEIGHT, learningRate, 20);
  const initial = distance(START_WEIGHT);
  const final = distance(path[path.length - 1]);
  // A step that lands within a hair of the bottom has not really chosen a side.
  const sides = path.map((w) => (Math.abs(w - BOWL_BOTTOM) < 1e-9 ? 0 : Math.sign(w - BOWL_BOTTOM)));
  const crossings = sides.slice(1).filter((s, i) => s !== 0 && sides[i] !== 0 && s !== sides[i]).length;
  if (final >= initial) return 'overshoots';
  if (crossings > 0) return 'bounces';
  return final / initial >= 0.05 ? 'crawls' : 'settles';
}

describe('the labels tell the truth', () => {
  it('matches what the ball does for every rate the slider can reach', () => {
    for (let hundredths = 2; hundredths <= 120; hundredths++) {
      const lr = hundredths / 100;
      expect(behaviourFor(lr), `learning rate ${lr}`).toBe(observed(lr));
    }
  });

  it('names all four behaviours somewhere on the slider', () => {
    const seen = new Set<Behaviour>();
    for (let hundredths = 2; hundredths <= 120; hundredths++) seen.add(behaviourFor(hundredths / 100));
    expect([...seen].sort()).toEqual(['bounces', 'crawls', 'overshoots', 'settles']);
  });
});
