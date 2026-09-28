import { describe, expect, it } from 'vitest';
import { collapseDemoNet, collapseLinear } from '../collapse';
import { createNetwork, predict, setActivation, shapeOf } from '../network';
import { makeRng } from '../rng';
import type { ActivationName, Network } from '../types';

/** A network with linear hidden layers and random weights. */
function linearNet(shape: number[], seed: number, output: ActivationName = 'sigmoid'): Network {
  let net = createNetwork(shape, { hidden: 'linear', output, seed });
  // Biases start at zero, which would hide bugs in how they are carried
  // through, so give every layer some.
  const rng = makeRng(seed + 1000);
  net = {
    ...net,
    layers: net.layers.map((l) => ({ ...l, biases: l.biases.map(() => (rng() - 0.5) * 2) })),
  };
  return net;
}

describe('collapsing a network with no squash', () => {
  const shapes = [[2, 3, 1], [2, 4, 4, 1], [3, 5, 2, 2], [2, 2, 2, 2, 1], [4, 1, 3]];

  it.each(shapes)('gives one layer that answers exactly like the original: %j', (...shape) => {
    for (let seed = 1; seed <= 20; seed++) {
      const net = linearNet(shape, seed);
      const collapsed = collapseLinear(net)!;
      expect(shapeOf(collapsed)).toEqual([shape[0], shape[shape.length - 1]]);
      const rng = makeRng(seed + 5000);
      for (let i = 0; i < 20; i++) {
        const x = Array.from({ length: shape[0] }, () => (rng() - 0.5) * 6);
        const a = predict(net, x);
        const b = predict(collapsed, x);
        a.forEach((v, j) => expect(b[j]).toBeCloseTo(v, 9));
      }
    }
  });

  it('keeps the output squash, because only the hidden ones vanish', () => {
    expect(collapseLinear(linearNet([2, 3, 1], 1, 'sigmoid'))!.layers[0].activation).toBe('sigmoid');
    expect(collapseLinear(linearNet([2, 3, 1], 1, 'tanh'))!.layers[0].activation).toBe('tanh');
  });

  it('multiplies the weights and carries the biases through, as the algebra says', () => {
    // One hidden neuron, one output: (w2·w1)·x + (w2·b1 + b2).
    const net: Network = {
      inputSize: 1,
      layers: [
        { weights: [[3]], biases: [0.5], activation: 'linear' },
        { weights: [[-2]], biases: [1], activation: 'linear' },
      ],
    };
    const c = collapseLinear(net)!;
    expect(c.layers[0].weights).toEqual([[-6]]);
    expect(c.layers[0].biases).toEqual([0]); // (-2)(0.5) + 1
  });

  it('refuses when a hidden layer has a real squash, because then it is not true', () => {
    expect(collapseLinear(createNetwork([2, 3, 1], { hidden: 'tanh', seed: 1 }))).toBeNull();
    expect(collapseLinear(setActivation(linearNet([2, 3, 3, 1], 1), 1, 'relu'))).toBeNull();
  });

  it('leaves a single layer as it is', () => {
    const net = createNetwork([2, 1], { seed: 4 });
    const c = collapseLinear(net)!;
    expect(c.layers[0].weights).toEqual(net.layers[0].weights);
  });

  it('does not touch the original', () => {
    const net = linearNet([2, 3, 1], 3);
    const before = JSON.stringify(net);
    collapseLinear(net);
    expect(JSON.stringify(net)).toBe(before);
  });
});

describe('the demo network', () => {
  it('collapses to the straight line 10x - 7.5y + 1.42 = 0 with no squash', () => {
    const c = collapseLinear(collapseDemoNet('linear'))!;
    const [wx, wy] = c.layers[0].weights[0];
    expect(wx).toBeCloseTo(10, 9);
    expect(wy).toBeCloseTo(-7.5, 9);
    expect(c.layers[0].biases[0]).toBeCloseTo(1.42, 9);
  });

  it('cannot be collapsed once tanh is in the way', () => {
    expect(collapseLinear(collapseDemoNet('tanh'))).toBeNull();
  });

  it('really does bend with tanh: its boundary is not a straight line', () => {
    // Walk down three columns and find where the answer crosses 0.5. For a
    // straight boundary those crossings lie on one line; here they do not.
    const net = collapseDemoNet('tanh');
    const crossingY = (x: number) => {
      let lo = -1;
      let hi = 1;
      for (let i = 0; i < 60; i++) {
        const mid = (lo + hi) / 2;
        // The output falls as y rises for this network.
        if (predict(net, [x, mid])[0] >= 0.5) lo = mid;
        else hi = mid;
      }
      return (lo + hi) / 2;
    };
    const [a, b, c] = [-0.6, 0, 0.6].map(crossingY);
    // Equal steps in x give equal steps in y along a straight line.
    expect(Math.abs(b - a - (c - b))).toBeGreaterThan(0.02);
  });
});
