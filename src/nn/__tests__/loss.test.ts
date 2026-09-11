import { describe, expect, it } from 'vitest';
import { accuracy, bce, datasetLoss, loss, lossGrad, mse } from '../loss';
import { createNetwork, setBias, setWeight } from '../network';
import { AND } from '../datasets';

describe('loss functions', () => {
  it('mse is zero for a perfect answer and grows with the square of the error', () => {
    expect(mse([1], [1])).toBe(0);
    expect(mse([0.5], [1])).toBeCloseTo(0.25, 12);
    expect(mse([0], [1])).toBeCloseTo(1, 12);
    expect(mse([0.9, 0.1], [1, 0])).toBeCloseTo(0.01, 12);
  });

  it('bce punishes confident wrong answers far harder than mse', () => {
    const nearlyRight = bce([0.9], [1]);
    const veryWrong = bce([0.01], [1]);
    expect(veryWrong / nearlyRight).toBeGreaterThan(20);
    expect(bce([0.5], [1])).toBeCloseTo(Math.log(2), 10);
  });

  it('bce stays finite at the extremes', () => {
    expect(Number.isFinite(bce([0], [1]))).toBe(true);
    expect(Number.isFinite(bce([1], [0]))).toBe(true);
  });

  it('loss gradients match finite differences of the loss', () => {
    for (const name of ['mse', 'bce'] as const) {
      const pred = [0.3, 0.8];
      const target = [1, 0];
      const analytic = lossGrad(name, pred, target);
      const eps = 1e-6;
      analytic.forEach((g, i) => {
        const up = pred.slice();
        const down = pred.slice();
        up[i] += eps;
        down[i] -= eps;
        expect(g).toBeCloseTo((loss(name, up, target) - loss(name, down, target)) / (2 * eps), 5);
      });
    }
  });
});

describe('dataset scoring', () => {
  it('a correct AND neuron scores full accuracy and low loss', () => {
    let net = createNetwork([2, 1]);
    net = setWeight(net, 0, 0, 0, 6);
    net = setWeight(net, 0, 0, 1, 6);
    net = setBias(net, 0, 0, -9);
    expect(accuracy(net, AND.points)).toBe(1);
    expect(datasetLoss(net, AND.points, 'mse')).toBeLessThan(0.02);
  });

  it('an untouched network sits at chance', () => {
    const net = createNetwork([2, 1]);
    // Every output is exactly 0.5. The threshold counts that as "on", so the
    // only row it gets right is the one that wanted a 1.
    expect(accuracy(net, AND.points)).toBe(0.25);
    expect(datasetLoss(net, AND.points, 'mse')).toBeCloseTo(0.25, 10);
  });

  it('an empty dataset is not an error', () => {
    expect(datasetLoss(createNetwork([2, 1]), [], 'mse')).toBe(0);
    expect(accuracy(createNetwork([2, 1]), [])).toBe(1);
  });
});
