import { describe, expect, it } from 'vitest';
import { backprop, batchGradients, numericalGradients, zeroGradients, applyGradients } from '../backprop';
import { createNetwork, forward, setBias, setWeight } from '../network';
import { datasetLoss } from '../loss';
import type { ActivationName, Gradients, Network, Sample } from '../types';
import { XOR } from '../datasets';

/** Compare two gradient bundles parameter by parameter. */
function expectGradsClose(a: Gradients, b: Gradients, precision = 5) {
  expect(a.weights.length).toBe(b.weights.length);
  a.weights.forEach((layer, l) =>
    layer.forEach((row, j) =>
      row.forEach((v, i) => {
        expect(v, `weight[${l}][${j}][${i}]`).toBeCloseTo(b.weights[l][j][i], precision);
      }),
    ),
  );
  a.biases.forEach((row, l) =>
    row.forEach((v, j) => {
      expect(v, `bias[${l}][${j}]`).toBeCloseTo(b.biases[l][j], precision);
    }),
  );
}

describe('backprop matches numerical gradients', () => {
  const shapes: number[][] = [
    [2, 1],
    [2, 3, 1],
    [2, 4, 3, 1],
    [3, 2, 2],
  ];
  const hiddens: ActivationName[] = ['sigmoid', 'tanh', 'relu', 'linear'];

  for (const shape of shapes) {
    for (const hidden of hiddens) {
      for (const lossName of ['mse', 'bce'] as const) {
        it(`shape ${shape.join('-')}, ${hidden} hidden, ${lossName} loss`, () => {
          // Sigmoid output keeps BCE in its valid (0, 1) domain.
          const net = createNetwork(shape, { hidden, output: 'sigmoid', seed: shape.length * 31 + hidden.length });
          const sample: Sample = {
            x: Array.from({ length: shape[0] }, (_, i) => (i % 2 === 0 ? 0.7 : -0.4)),
            y: Array.from({ length: shape[shape.length - 1] }, (_, i) => (i % 2 === 0 ? 1 : 0)),
          };
          expectGradsClose(backprop(net, sample, lossName), numericalGradients(net, sample, lossName));
        });
      }
    }
  }

  it('handles a whole batch', () => {
    const net = createNetwork([2, 3, 1], { seed: 77 });
    expectGradsClose(batchGradients(net, XOR.points, 'mse'), numericalGradients(net, XOR.points, 'mse'));
  });

  it('still matches when weights are large enough to saturate the sigmoid', () => {
    let net: Network = createNetwork([2, 2, 1]);
    net = setWeight(net, 0, 0, 0, 6.5);
    net = setWeight(net, 0, 0, 1, -7.2);
    net = setWeight(net, 0, 1, 0, -5.1);
    net = setWeight(net, 0, 1, 1, 4.4);
    net = setBias(net, 0, 0, -3.3);
    net = setWeight(net, 1, 0, 0, 8);
    net = setWeight(net, 1, 0, 1, -8);
    net = setBias(net, 1, 0, 1.5);
    const sample: Sample = { x: [1, 0], y: [1] };
    expectGradsClose(backprop(net, sample, 'mse'), numericalGradients(net, sample, 'mse'), 4);
  });
});

describe('gradient bookkeeping', () => {
  it('zeroGradients mirrors the network shape', () => {
    const g = zeroGradients(createNetwork([2, 3, 1]));
    expect(g.weights[0]).toHaveLength(3);
    expect(g.weights[0][0]).toHaveLength(2);
    expect(g.biases[1]).toHaveLength(1);
    expect(g.weights.flat(2).every((v) => v === 0)).toBe(true);
  });

  it('a gradient step reduces the loss', () => {
    const net = createNetwork([2, 3, 1], { seed: 4 });
    const data = XOR.points;
    const before = datasetLoss(net, data, 'mse');
    const after = datasetLoss(applyGradients(net, batchGradients(net, data, 'mse'), 0.5), data, 'mse');
    expect(after).toBeLessThan(before);
  });

  it('a step function produces no gradients at all', () => {
    const net = createNetwork([2, 1], { output: 'step' });
    const g = backprop(net, { x: [1, 1], y: [1] }, 'mse');
    expect(g.weights.flat(2).every((v) => v === 0)).toBe(true);
    expect(g.biases.flat().every((v) => v === 0)).toBe(true);
  });

  it('the output activation is differentiated too', () => {
    // A linear output with MSE has a gradient of exactly 2(pred - target) * input.
    let net = createNetwork([1, 1], { output: 'linear' });
    net = setWeight(net, 0, 0, 0, 2);
    net = setBias(net, 0, 0, 1);
    const sample: Sample = { x: [3], y: [0] };
    expect(forward(net, sample.x).output[0]).toBe(7);
    const g = backprop(net, sample, 'mse');
    expect(g.biases[0][0]).toBeCloseTo(2 * 7, 9);
    expect(g.weights[0][0][0]).toBeCloseTo(2 * 7 * 3, 9);
  });
});
