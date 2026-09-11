import { describe, expect, it } from 'vitest';
import {
  addLayer,
  addNeuron,
  countParams,
  createNetwork,
  forward,
  predict,
  removeLayer,
  removeNeuron,
  setActivation,
  setBias,
  setWeight,
  shapeOf,
} from '../network';
import { activations } from '../activations';

describe('createNetwork', () => {
  it('builds the shape it is asked for', () => {
    const net = createNetwork([2, 3, 1]);
    expect(shapeOf(net)).toEqual([2, 3, 1]);
    expect(net.layers).toHaveLength(2);
    expect(net.layers[0].weights).toHaveLength(3);
    expect(net.layers[0].weights[0]).toHaveLength(2);
    expect(net.layers[1].weights[0]).toHaveLength(3);
  });

  it('counts every weight and bias', () => {
    // (2*3 + 3) + (3*1 + 1) = 9 + 4
    expect(countParams(createNetwork([2, 3, 1]))).toBe(13);
  });

  it('starts at all zeros unless given a seed', () => {
    const net = createNetwork([2, 2, 1]);
    expect(net.layers.flatMap((l) => l.weights.flat())).toEqual([0, 0, 0, 0, 0, 0]);
    const seeded = createNetwork([2, 2, 1], { seed: 42 });
    expect(seeded.layers[0].weights[0][0]).not.toBe(0);
  });

  it('is deterministic for a given seed', () => {
    expect(createNetwork([2, 3, 1], { seed: 5 })).toEqual(createNetwork([2, 3, 1], { seed: 5 }));
  });
});

describe('forward pass', () => {
  it('computes a single neuron by hand', () => {
    // One neuron, two inputs: (0.8 * 1) + (-1.2 * 0) + 0.3 = 1.1
    let net = createNetwork([2, 1]);
    net = setWeight(net, 0, 0, 0, 0.8);
    net = setWeight(net, 0, 0, 1, -1.2);
    net = setBias(net, 0, 0, 0.3);

    const trace = forward(net, [1, 0]);
    expect(trace.preActivations[0][0]).toBeCloseTo(1.1, 12);
    expect(trace.output[0]).toBeCloseTo(activations.sigmoid.f(1.1), 12);
    expect(trace.output[0]).toBeCloseTo(0.750260, 5);
  });

  it('keeps the inputs as the first entry of the trace', () => {
    const net = createNetwork([2, 2, 1], { seed: 3 });
    const trace = forward(net, [0.25, -0.5]);
    expect(trace.activations[0]).toEqual([0.25, -0.5]);
    expect(trace.activations).toHaveLength(3);
    expect(trace.activations[2]).toEqual(trace.output);
  });

  it('propagates through two layers in the right order', () => {
    let net = createNetwork([1, 1, 1], { hidden: 'linear', output: 'linear' });
    net = setWeight(net, 0, 0, 0, 2);
    net = setBias(net, 0, 0, 1);
    net = setWeight(net, 1, 0, 0, 3);
    net = setBias(net, 1, 0, -4);
    // ((5 * 2) + 1) * 3 - 4 = 29
    expect(forward(net, [5]).output[0]).toBeCloseTo(29, 12);
  });

  it('predict agrees with forward', () => {
    const net = createNetwork([2, 4, 3, 2], { seed: 9 });
    for (const x of [[0, 0], [1, -1], [0.3, 0.7]]) {
      expect(predict(net, x)).toEqual(forward(net, x).output);
    }
  });
});

describe('editing is immutable', () => {
  it('setWeight leaves the original alone', () => {
    const net = createNetwork([2, 1]);
    const next = setWeight(net, 0, 0, 0, 5);
    expect(net.layers[0].weights[0][0]).toBe(0);
    expect(next.layers[0].weights[0][0]).toBe(5);
    expect(next).not.toBe(net);
  });

  it('setBias and setActivation leave the original alone', () => {
    const net = createNetwork([2, 1]);
    expect(setBias(net, 0, 0, 2).layers[0].biases[0]).toBe(2);
    expect(net.layers[0].biases[0]).toBe(0);
    expect(setActivation(net, 0, 'relu').layers[0].activation).toBe('relu');
    expect(net.layers[0].activation).toBe('sigmoid');
  });
});

describe('topology editing keeps the network runnable', () => {
  it('addNeuron rewires the following layer', () => {
    const net = addNeuron(createNetwork([2, 2, 1], { seed: 1 }), 0);
    expect(shapeOf(net)).toEqual([2, 3, 1]);
    expect(net.layers[1].weights[0]).toHaveLength(3);
    expect(() => predict(net, [1, 1])).not.toThrow();
  });

  it('removeNeuron rewires the following layer and refuses to empty one', () => {
    const net = removeNeuron(createNetwork([2, 3, 1], { seed: 1 }), 0, 1);
    expect(shapeOf(net)).toEqual([2, 2, 1]);
    expect(net.layers[1].weights[0]).toHaveLength(2);
    const single = createNetwork([2, 1]);
    expect(shapeOf(removeNeuron(single, 0, 0))).toEqual([2, 1]);
  });

  it('addLayer and removeLayer keep the shapes consistent', () => {
    let net = createNetwork([2, 1], { seed: 2 });
    net = addLayer(net, 0, 4);
    expect(shapeOf(net)).toEqual([2, 4, 1]);
    expect(net.layers[1].weights[0]).toHaveLength(4);
    expect(() => predict(net, [0.5, 0.5])).not.toThrow();

    net = removeLayer(net, 0);
    expect(shapeOf(net)).toEqual([2, 1]);
    expect(net.layers[0].weights[0]).toHaveLength(2);
    expect(() => predict(net, [0.5, 0.5])).not.toThrow();
  });

  it('will not remove the output layer', () => {
    const net = createNetwork([2, 1]);
    expect(removeLayer(net, 0)).toBe(net);
  });
});
