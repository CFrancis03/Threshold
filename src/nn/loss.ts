import { predict } from './network';
import type { Network, Sample } from './types';

/**
 * Loss functions — a single number saying "how wrong are we?".
 *
 * Training is nothing more than making this number smaller.
 */

export type LossName = 'mse' | 'bce';

/** Keeps log() away from zero. */
const EPS = 1e-9;

/** Mean squared error: average of (guess − answer)², the everyday choice. */
export function mse(pred: number[], target: number[]): number {
  let sum = 0;
  for (let i = 0; i < pred.length; i++) {
    const d = pred[i] - target[i];
    sum += d * d;
  }
  return sum / pred.length;
}

/**
 * Binary cross-entropy: punishes confident wrong answers much harder than MSE.
 * Only meaningful when the output is a probability in (0, 1).
 */
export function bce(pred: number[], target: number[]): number {
  let sum = 0;
  for (let i = 0; i < pred.length; i++) {
    const p = Math.min(1 - EPS, Math.max(EPS, pred[i]));
    sum += -(target[i] * Math.log(p) + (1 - target[i]) * Math.log(1 - p));
  }
  return sum / pred.length;
}

export function loss(name: LossName, pred: number[], target: number[]): number {
  return name === 'bce' ? bce(pred, target) : mse(pred, target);
}

/** dL/d(output), the first link in the backprop chain. */
export function lossGrad(name: LossName, pred: number[], target: number[]): number[] {
  const n = pred.length;
  if (name === 'bce') {
    return pred.map((p, i) => {
      const c = Math.min(1 - EPS, Math.max(EPS, p));
      return (c - target[i]) / (c * (1 - c) * n);
    });
  }
  return pred.map((p, i) => (2 * (p - target[i])) / n);
}

/** Average loss across a whole dataset. */
export function datasetLoss(net: Network, data: Sample[], name: LossName = 'mse'): number {
  if (data.length === 0) return 0;
  let total = 0;
  for (const s of data) total += loss(name, predict(net, s.x), s.y);
  return total / data.length;
}

/** Fraction of samples where the output lands on the right side of 0.5. */
export function accuracy(net: Network, data: Sample[], threshold = 0.5): number {
  if (data.length === 0) return 1;
  let correct = 0;
  for (const s of data) {
    const out = predict(net, s.x)[0];
    if ((out >= threshold ? 1 : 0) === (s.y[0] >= threshold ? 1 : 0)) correct++;
  }
  return correct / data.length;
}
