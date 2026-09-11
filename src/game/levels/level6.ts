import { makeCircle } from '../../nn/datasets';
import { isTrainable } from '../../nn/train';
import type { LevelDef } from '../types';
import { boxNetwork } from './boxNetwork';

const CIRCLE = makeCircle();

/**
 * Level 6 — the squash itself.
 *
 * The network is the finished level 5 answer, but with ReLU in the hidden
 * layer, where it falls apart completely. The player tries all four.
 *
 * Two of them classify every point. The third, the step function, also gets
 * there — and is then refused, because a function whose slope is zero
 * everywhere gives gradient descent nothing to follow. That is not a
 * technicality invented for the puzzle: it is the reason the field stopped
 * using step functions, and it is exactly what level 7 is about to need.
 */
export const level6: LevelDef = {
  id: 6,
  title: 'Six',
  subtitle: 'Activation functions',
  view: 'boundary',
  allow: { weights: true, biases: true, activation: true, train: false },
  inputLabels: ['x', 'y'],
  activationChoices: ['step', 'sigmoid', 'tanh', 'relu'],
  makeNetwork: () => boxNetwork({ hidden: 'relu', offset: 0.5 }),
  stages: [
    {
      key: 'squash',
      goal: 'Find a squash this network can actually use',
      intro:
        'Same four detectors as last time, already in the right places — but the squash has been swapped for ReLU and the whole thing has stopped working. Open any neuron and try the four options. Watch what each one does to the shape of the boundary.',
      hint: 'ReLU passes big numbers straight through, so four detectors that should each report "yes, about 1" instead shout numbers far too large for the output neuron to weigh up. The step function fixes that, but look closely at the corners — and then ask yourself whether a function with no slope anywhere could ever be trained.',
      learned:
        'The squash is not a detail. ReLU has no ceiling, so a detector meant to answer yes or no can drown out the others. The step function answers cleanly but has a slope of zero everywhere, which leaves gradient descent nothing to follow. Sigmoid and tanh are the compromise: soft enough to have a slope, bounded enough to behave.',
      dataset: CIRCLE,
    },
  ],
  blocker: (net) =>
    isTrainable(net)
      ? null
      : 'Every point is on the right side — but this network could never be trained. The step function is flat everywhere, so its slope is always zero, and gradient descent moves a weight by following its slope. Pick a squash that has one.',
  solution: () => boxNetwork({ hidden: 'sigmoid', offset: 0.5 }),
};
