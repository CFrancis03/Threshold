import { createNetwork, setBias, setWeight } from '../../nn/network';
import { AND } from '../../nn/datasets';
import type { LevelDef } from '../types';

/**
 * Level 1 — the whole vocabulary, on one neuron.
 *
 * Everything starts at zero, so the first drag is the first thing that ever
 * happens. That is deliberate: the player should see a number they set change
 * an answer before they are told what any of it is called.
 */
export const level1: LevelDef = {
  id: 1,
  title: 'One',
  subtitle: 'One neuron, one job',
  view: 'truthTable',
  allow: { weights: true, biases: true, activation: false, train: false },
  makeNetwork: () => createNetwork([2, 1]),
  stages: [
    {
      key: 'and',
      goal: 'Make this neuron behave like AND',
      intro:
        'A neuron multiplies each input by a weight, adds them up, adds one more number called the bias, and squashes the total into a value between 0 and 1. Above 0.5 we say it fired. Get this one to fire only when both inputs are 1.',
      hint: 'Make both weights clearly positive. Then push the bias down until one input on its own is no longer enough — it takes both together to get over the line.',
      learned:
        'A weight decides how much an input counts. The bias decides how much total is needed before the neuron fires. Those two ideas are the whole of a neuron.',
      dataset: AND,
    },
  ],
  solution: () => {
    let net = createNetwork([2, 1]);
    net = setWeight(net, 0, 0, 0, 6);
    net = setWeight(net, 0, 0, 1, 6);
    net = setBias(net, 0, 0, -9);
    return net;
  },
};
