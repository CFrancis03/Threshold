import { createNetwork } from '../../nn/network';
import { initTrainState, trainFor } from '../../nn/train';
import type { Network } from '../../nn/types';
import { makeSpiral } from '../../nn/datasets';
import type { LevelDef } from '../types';

const SPIRAL = makeSpiral();

/**
 * Level 7 — hand it over.
 *
 * The dataset is deliberately past what anyone would hand-tune. The player
 * presses Train and watches the same weights they have been dragging all game
 * move on their own, with the loss curve drawn beside them.
 */
export const level7: LevelDef = {
  id: 7,
  title: 'Seven',
  subtitle: 'Let the machine learn',
  view: 'train',
  allow: { weights: true, biases: true, activation: false, train: true },
  inputLabels: ['x', 'y'],
  makeNetwork: () => createNetwork([2, 8, 8, 1], { hidden: 'tanh', output: 'sigmoid', seed: 33 }),
  learningRate: 0.4,
  stages: [
    {
      key: 'spiral',
      goal: 'Let gradient descent find the weights',
      intro:
        'Two spiral arms. You could tune this by hand, in about a month. Instead, press Train: the network measures how wrong it is, works out which way to nudge every single weight to be a little less wrong, and does that a few hundred times a second. Watch the weights move.',
      hint: 'If the loss curve drops and then goes flat too high, the learning rate is too small — raise it. If it thrashes up and down or explodes, the steps are too big — lower it. Somewhere in between it falls smoothly. Start over if a run gets stuck.',
      learned:
        'That is all training is. For every weight, work out whether nudging it up or down would reduce the error, then take a small step that way — over and over. Backpropagation is just the efficient way to get all those answers at once, by working backwards from the output. Nobody told the network what a spiral was.',
      dataset: SPIRAL,
      requiredAccuracy: 0.95,
    },
  ],
  // The only level whose answer is found rather than written down. It runs
  // the same trainStep the Train button runs, at the same default learning
  // rate, so the test proves the level is beatable by doing exactly what the
  // player does. Memoised because it is not cheap.
  solution: () => trainedSpiral(),
};

let cached: Network | null = null;

export function trainedSpiral(steps = 2000): Network {
  if (cached) return cached;
  const start = level7.makeNetwork();
  cached = trainFor(
    initTrainState(start, SPIRAL.points, 'bce'),
    SPIRAL.points,
    { learningRate: level7.learningRate!, loss: 'bce', momentum: 0.9 },
    steps,
  ).net;
  return cached;
}
