import { describe, expect, it } from 'vitest';
import { activations, normalizeActivation } from '../activations';

describe('activation functions', () => {
  it('sigmoid squashes into (0, 1) and is centred at 0.5', () => {
    const { f } = activations.sigmoid;
    expect(f(0)).toBeCloseTo(0.5, 12);
    expect(f(2)).toBeCloseTo(0.880797, 5);
    expect(f(-2)).toBeCloseTo(0.119203, 5);
    expect(f(1000)).toBe(1);
    expect(f(-1000)).toBeCloseTo(0, 12);
    expect(Number.isFinite(f(-1000))).toBe(true);
  });

  it('step fires exactly at zero', () => {
    const { f } = activations.step;
    expect(f(-0.0001)).toBe(0);
    expect(f(0)).toBe(1);
    expect(f(3)).toBe(1);
  });

  it('relu passes positives through unchanged', () => {
    const { f } = activations.relu;
    expect(f(-5)).toBe(0);
    expect(f(0)).toBe(0);
    expect(f(2.5)).toBe(2.5);
  });

  it('tanh is odd and saturates at ±1', () => {
    const { f } = activations.tanh;
    expect(f(0)).toBe(0);
    expect(f(-1.3)).toBeCloseTo(-f(1.3), 12);
    expect(f(20)).toBeCloseTo(1, 10);
  });

  // Every derivative is checked against a finite difference, which is the
  // same trick the backprop test uses one level up.
  it.each(['sigmoid', 'tanh', 'relu', 'linear'] as const)('%s derivative matches finite differences', (name) => {
    const { f, df } = activations[name];
    for (const z of [-2.7, -1, -0.3, 0.4, 1.2, 3.5]) {
      const eps = 1e-6;
      const numeric = (f(z + eps) - f(z - eps)) / (2 * eps);
      expect(df(z, f(z))).toBeCloseTo(numeric, 5);
    }
  });

  it('step is flagged as untrainable because its slope is always zero', () => {
    expect(activations.step.trainable).toBe(false);
    expect(activations.step.df(1, 1)).toBe(0);
  });

  it('normalizes activations onto 0..1 using the function range', () => {
    expect(normalizeActivation(0.5, 'sigmoid')).toBeCloseTo(0.5);
    expect(normalizeActivation(0, 'tanh')).toBeCloseTo(0.5);
    expect(normalizeActivation(-1, 'tanh')).toBeCloseTo(0);
    expect(normalizeActivation(99, 'relu')).toBe(1);
  });
});
