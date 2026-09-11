import { createNetwork, setBias, setWeight } from '../../nn/network';
import { NAND, OR } from '../../nn/datasets';
import type { LevelDef } from '../types';

/**
 * Level 2 — the same neuron, two more jobs.
 *
 * Two stages on purpose. Doing OR right after AND shows that only the numbers
 * changed; doing NAND after that shows that a negative weight is not a broken
 * weight, it is an argument against.
 */
export const level2: LevelDef = {
  id: 2,
  title: 'Two',
  subtitle: 'Flip it',
  view: 'truthTable',
  allow: { weights: true, biases: true, activation: false, train: false },
  makeNetwork: () => createNetwork([2, 1]),
  stages: [
    {
      key: 'or',
      goal: 'Now make the same neuron behave like OR',
      intro:
        'Same neuron, same two inputs, different job. This time it should fire when either input is 1 — or both.',
      hint: 'Keep the weights where they were and raise the bias. You are lowering the bar: now one input on its own is enough to get over it.',
      learned:
        'Nothing about the neuron changed except three numbers. The bias is the bar the total has to clear, and raising it makes the neuron easier to set off.',
      dataset: OR,
    },
    {
      key: 'nand',
      goal: 'One more: make it behave like NAND',
      intro:
        'NAND is AND upside down. It fires in every case except when both inputs are 1. To do that, an input has to count against firing rather than for it.',
      hint: 'Try negative weights with a positive bias. The neuron now starts out on, and each input pushes it back down.',
      learned:
        'A negative weight is evidence against firing. With weights either side of zero, one neuron can argue in both directions.',
      dataset: NAND,
      resetNetwork: true,
    },
  ],
  // Stage 0 is OR, stage 1 is NAND. Same neuron, opposite signs.
  solution: (stage = 0) => {
    let net = createNetwork([2, 1]);
    const sign = stage === 0 ? 1 : -1;
    net = setWeight(net, 0, 0, 0, 6 * sign);
    net = setWeight(net, 0, 0, 1, 6 * sign);
    net = setBias(net, 0, 0, stage === 0 ? -3 : 9);
    return net;
  },
};
