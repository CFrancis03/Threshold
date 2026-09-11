import { describe, expect, it } from 'vitest';
import { initTrainState, isTrainable, trainFor, trainStep } from '../train';
import { createNetwork, predict, setActivation } from '../network';
import { accuracy } from '../loss';
import { XOR, AND, makeCircle, makeSpiral } from '../datasets';

describe('training', () => {
  it('learns AND with a single neuron', () => {
    const net = createNetwork([2, 1], { seed: 3 });
    const end = trainFor(initTrainState(net, AND.points), AND.points, { learningRate: 4, loss: 'mse' }, 2000);
    expect(accuracy(end.net, AND.points)).toBe(1);
    expect(end.loss).toBeLessThan(0.05);
  });

  it('cannot learn XOR with a single neuron, however long it runs', () => {
    const net = createNetwork([2, 1], { seed: 3 });
    const end = trainFor(initTrainState(net, XOR.points), XOR.points, { learningRate: 4, loss: 'mse' }, 4000);
    // Three of four rows is the ceiling for one straight line.
    expect(accuracy(end.net, XOR.points)).toBeLessThanOrEqual(0.75);
  });

  it('learns XOR once a hidden layer is added', () => {
    const net = createNetwork([2, 3, 1], { seed: 12 });
    const end = trainFor(
      initTrainState(net, XOR.points),
      XOR.points,
      { learningRate: 1.5, loss: 'bce', momentum: 0.9 },
      4000,
    );
    expect(accuracy(end.net, XOR.points)).toBe(1);
  });

  it('learns the circle dataset', () => {
    const data = makeCircle().points;
    const net = createNetwork([2, 5, 1], { hidden: 'tanh', output: 'sigmoid', seed: 21 });
    const end = trainFor(initTrainState(net, data), data, { learningRate: 0.6, loss: 'bce', momentum: 0.9 }, 3000);
    expect(accuracy(end.net, data)).toBeGreaterThan(0.95);
  });

  it('learns the spiral, which is what level 7 needs', { timeout: 30000 }, () => {
    const data = makeSpiral().points;
    const net = createNetwork([2, 8, 8, 1], { hidden: 'tanh', output: 'sigmoid', seed: 33 });
    const start = initTrainState(net, data, 'bce');
    const end = trainFor(start, data, { learningRate: 0.4, loss: 'bce', momentum: 0.9 }, 2000);
    expect(end.loss).toBeLessThan(start.loss * 0.2);
    expect(accuracy(end.net, data)).toBeGreaterThan(0.95);
  });

  it('learns the spiral from mini-batches too, because the data is shuffled', { timeout: 30000 }, () => {
    // Points are generated one arm at a time. If the dataset were left in that
    // order, every contiguous mini-batch would hold a single label and training
    // would just rock back and forth.
    const data = makeSpiral().points;
    const net = createNetwork([2, 8, 8, 1], { hidden: 'tanh', output: 'sigmoid', seed: 33 });
    const end = trainFor(
      initTrainState(net, data, 'bce'),
      data,
      { learningRate: 0.3, loss: 'bce', momentum: 0.9, batchSize: 16 },
      2500,
    );
    expect(accuracy(end.net, data)).toBeGreaterThan(0.9);
  });

  it('records one loss reading per step and keeps the history bounded', () => {
    const s = trainFor(initTrainState(createNetwork([2, 2, 1], { seed: 1 }), XOR.points), XOR.points, {
      learningRate: 0.5,
      loss: 'mse',
    }, 30);
    expect(s.step).toBe(30);
    expect(s.history).toHaveLength(31);

    const long = trainFor(initTrainState(createNetwork([2, 2, 1], { seed: 1 }), XOR.points), XOR.points, {
      learningRate: 0.5,
      loss: 'mse',
    }, 900);
    expect(long.history.length).toBeLessThanOrEqual(600);
  });

  it('a learning rate that is far too high makes things worse, not better', () => {
    const data = makeCircle().points;
    const net = createNetwork([2, 4, 1], { seed: 8 });
    const start = initTrainState(net, data, 'bce');
    const wild = trainFor(start, data, { learningRate: 500, loss: 'bce' }, 200);
    expect(wild.loss).toBeGreaterThan(start.loss);
  });

  it('mini-batches walk through the dataset instead of standing still', () => {
    const data = makeCircle().points;
    const s0 = initTrainState(createNetwork([2, 3, 1], { seed: 2 }), data);
    const s1 = trainStep(s0, data, { learningRate: 0.5, loss: 'mse', batchSize: 10 });
    const s2 = trainStep(s1, data, { learningRate: 0.5, loss: 'mse', batchSize: 10 });
    expect(s1.cursor).toBe(10);
    expect(s2.cursor).toBe(20);
  });

  it('leaves the starting network untouched', () => {
    const net = createNetwork([2, 2, 1], { seed: 6 });
    const before = predict(net, [1, 0])[0];
    trainFor(initTrainState(net, XOR.points), XOR.points, { learningRate: 1, loss: 'mse' }, 100);
    expect(predict(net, [1, 0])[0]).toBe(before);
  });

  it('knows a step-function network cannot be trained', () => {
    expect(isTrainable(createNetwork([2, 2, 1]))).toBe(true);
    expect(isTrainable(setActivation(createNetwork([2, 2, 1]), 1, 'step'))).toBe(false);
  });
});
