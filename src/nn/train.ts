import { applyGradients, batchGradients, gradientMagnitude } from './backprop';
import { getActivation } from './activations';
import { accuracy, datasetLoss, type LossName } from './loss';
import type { Gradients, Network, Sample } from './types';

/**
 * Gradient descent, expressed as a pure step function.
 *
 * The UI drives this from requestAnimationFrame and renders after every single
 * step, which is the whole point of level 7: you watch the weights move.
 */

export interface TrainOptions {
  learningRate: number;
  loss: LossName;
  /** Mini-batch size. Omit or 0 for full-batch (all samples every step). */
  batchSize?: number;
  /** 0 = plain gradient descent. 0.9 is the usual "keep rolling" value. */
  momentum?: number;
}

export interface TrainState {
  net: Network;
  step: number;
  loss: number;
  accuracy: number;
  /** One loss reading per step, for the curve drawn beside the network. */
  history: number[];
  /** Exponentially-smoothed previous update, used when momentum > 0. */
  velocity: Gradients | null;
  /** Largest gradient seen on the last step — "how hard is it pulling?". */
  pull: number;
  /** Where the shuffled sampler is up to, so mini-batches keep moving. */
  cursor: number;
}

export function initTrainState(net: Network, data: Sample[], lossName: LossName = 'mse'): TrainState {
  return {
    net,
    step: 0,
    loss: datasetLoss(net, data, lossName),
    accuracy: accuracy(net, data),
    history: [datasetLoss(net, data, lossName)],
    velocity: null,
    pull: 0,
    cursor: 0,
  };
}

/** True when every layer's activation has a usable derivative. */
export function isTrainable(net: Network): boolean {
  return net.layers.every((l) => getActivation(l.activation).trainable);
}

const MAX_HISTORY = 600;

export function trainStep(state: TrainState, data: Sample[], opts: TrainOptions): TrainState {
  const { learningRate, loss: lossName, batchSize = 0, momentum = 0 } = opts;
  if (data.length === 0) return state;

  // Pick this step's batch. Walking a cursor through the dataset gives us
  // stochastic behaviour without needing to reshuffle arrays every frame.
  let batch = data;
  let cursor = state.cursor;
  if (batchSize > 0 && batchSize < data.length) {
    batch = [];
    for (let i = 0; i < batchSize; i++) {
      batch.push(data[(cursor + i) % data.length]);
    }
    cursor = (cursor + batchSize) % data.length;
  }

  let update = batchGradients(state.net, batch, lossName);

  // Momentum: keep a little of the previous step's direction. It smooths out
  // the zig-zagging that plain descent does in narrow valleys.
  if (momentum > 0 && state.velocity) {
    update = {
      weights: update.weights.map((layer, l) =>
        layer.map((row, j) => row.map((v, i) => v + momentum * state.velocity!.weights[l][j][i])),
      ),
      biases: update.biases.map((row, l) => row.map((v, j) => v + momentum * state.velocity!.biases[l][j])),
    };
  }

  const net = applyGradients(state.net, update, learningRate);
  const nextLoss = datasetLoss(net, data, lossName);
  const history = state.history.length >= MAX_HISTORY ? state.history.slice(1) : state.history.slice();
  history.push(nextLoss);

  return {
    net,
    step: state.step + 1,
    loss: nextLoss,
    accuracy: accuracy(net, data),
    history,
    velocity: momentum > 0 ? update : null,
    pull: gradientMagnitude(update),
    cursor,
  };
}

/** Run many steps at once — used by tests and by "train to convergence". */
export function trainFor(state: TrainState, data: Sample[], opts: TrainOptions, steps: number): TrainState {
  let s = state;
  for (let i = 0; i < steps; i++) s = trainStep(s, data, opts);
  return s;
}
