import { makeCircle } from '../../nn/datasets';
import type { LevelDef } from '../types';
import { boxNetwork } from './boxNetwork';

const CIRCLE = makeCircle();

/**
 * Level 5 — four lines, one shape.
 *
 * The hidden neurons come pre-aimed, one per direction, all four lines sitting
 * on top of each other through the middle. The player pushes each one outwards
 * until they box the circle in. The mini-heatmaps beside the network show what
 * each neuron sees on its own, so "a hidden neuron is a detector" is something
 * you watch rather than something you are told.
 */
export const level5: LevelDef = {
  id: 5,
  title: 'Five',
  subtitle: 'Hidden layers as feature detectors',
  view: 'boundaryWithHidden',
  allow: { weights: true, biases: true, activation: false, train: false },
  inputLabels: ['x', 'y'],
  makeNetwork: () => boxNetwork({ offset: 0 }),
  stages: [
    {
      key: 'circle',
      goal: 'Fence the circle in with four lines',
      intro:
        'Four hidden neurons, each already aimed at one direction, and an output neuron that only fires when all four agree. Right now all four lines sit on top of each other through the middle, so nothing ever agrees. Push each one outwards until they surround the round cluster.',
      hint: 'Drag each hidden neuron up to raise its bias — that slides its line away from the centre without turning it. Watch the small pictures: each neuron shades the half of the square it is happy with, and the output lights up only where all four shaded halves overlap.',
      learned:
        'A hidden neuron is a detector: it draws one line and reports which side you are on. The layer after it can combine those reports into a shape no single line could make. Stack enough of them and you can fence off almost anything.',
      dataset: CIRCLE,
    },
  ],
  solution: () => boxNetwork({ offset: 0.5 }),
};
