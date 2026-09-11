import { createNetwork, setBias, setWeight } from '../../nn/network';
import { makeTwoClusters } from '../../nn/datasets';
import type { LevelDef } from '../types';

const CLUSTERS = makeTwoClusters();

/**
 * Level 3 — the same neuron, seen from above.
 *
 * This is where the truth table is replaced by the picture it was always
 * describing: the neuron cuts the input space in half with one straight line,
 * and the weights and bias are just a way of saying where that line goes.
 */
export const level3: LevelDef = {
  id: 3,
  title: 'Three',
  subtitle: 'Seeing the line',
  view: 'boundary',
  allow: { weights: true, biases: true, activation: false, train: false },
  // A small seed rather than zeros: a flat network paints no line at all,
  // and this level is about moving a line.
  makeNetwork: () => createNetwork([2, 1], { seed: 47 }),
  inputLabels: ['x', 'y'],
  stages: [
    {
      key: 'clusters',
      goal: 'Separate the two groups of points',
      intro:
        'Here is the same neuron drawn a different way: every point on the square is an input, and the shading is what the neuron answers there. One neuron always draws exactly one straight line. Move it until the two groups are on opposite sides.',
      hint: 'The two weights decide which way the line leans, and the bias slides it across the square without turning it. Get the angle roughly right first, then slide.',
      learned:
        'Weights set the direction of the line; the bias sets how far along it sits. That is all a single neuron can ever draw — one straight cut through the space.',
      dataset: CLUSTERS,
    },
  ],
  solution: () => {
    let net = createNetwork([2, 1]);
    net = setWeight(net, 0, 0, 0, 7.2);
    net = setWeight(net, 0, 0, 1, 6);
    net = setBias(net, 0, 0, -0.15);
    return net;
  },
};
