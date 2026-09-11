import { createNetwork, setBias, setWeight } from '../../nn/network';
import { XOR } from '../../nn/datasets';
import type { LevelDef } from '../types';

/**
 * Level 4 — the wall.
 *
 * The player is asked for something a single neuron provably cannot do, and is
 * allowed to fail at it properly. Three of four rows is the ceiling, and the
 * level says so out loud once they have found that ceiling for themselves.
 * Only then does the hidden layer appear.
 */
export const level4: LevelDef = {
  id: 4,
  title: 'Four',
  subtitle: 'The impossible one',
  view: 'boundary',
  allow: { weights: true, biases: true, activation: false, train: false },
  makeNetwork: () => createNetwork([2, 1], { seed: 8 }),
  stages: [
    {
      key: 'xor',
      goal: 'Make this neuron behave like XOR',
      intro:
        'XOR fires when exactly one input is 1, and not when both are. It is the same kind of puzzle as the last three. Have a go — and watch the picture while you do.',
      hint: 'You may have noticed you can get three rows right but never the fourth. That is not you. One straight line cannot cut this square so that the two corners on one diagonal are apart from the two on the other. Ask for the hidden layer when you have had enough.',
      learned:
        'No single straight line can separate these four corners, so no single neuron can ever do XOR. Two neurons each draw a line, and a third neuron combines their answers — which is what a hidden layer is for.',
      dataset: XOR,
    },
  ],
  escape: {
    afterAttempts: 3,
    label: 'Add a hidden layer',
    note: 'Two neurons, each drawing their own line, and an output neuron that combines what they say.',
    apply: () => createNetwork([2, 2, 1], { seed: 19 }),
  },
  solution: () => {
    // h1 behaves like OR, h2 like AND, and the output fires when the first
    // says yes and the second says no — which is exactly XOR.
    let net = createNetwork([2, 2, 1]);
    net = setWeight(net, 0, 0, 0, 6);
    net = setWeight(net, 0, 0, 1, 6);
    net = setBias(net, 0, 0, -3);
    net = setWeight(net, 0, 1, 0, 6);
    net = setWeight(net, 0, 1, 1, 6);
    net = setBias(net, 0, 1, -9);
    net = setWeight(net, 1, 0, 0, 10);
    net = setWeight(net, 1, 0, 1, -10);
    net = setBias(net, 1, 0, -4);
    return net;
  },
};
