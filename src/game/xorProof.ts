import { forward } from '../nn/network';
import type { Network } from '../nn/types';

/**
 * The argument for why one neuron can never do XOR, as numbers you can watch.
 *
 * A neuron says yes when its sum z is above zero and no when it is below. XOR
 * wants yes at (0,1) and (1,0) and no at (0,0) and (1,1). Writing z out for
 * each corner:
 *
 *     (0,0)  z = b
 *     (0,1)  z = w2 + b
 *     (1,0)  z = w1 + b
 *     (1,1)  z = w1 + w2 + b
 *
 * Add the two corners that need a positive z:  w1 + w2 + 2b.
 * Add the two corners that need a negative z:  w1 + w2 + 2b.
 *
 * The same expression. One number cannot be both above and below zero, so no
 * choice of weights works. The identity holds for every network of this shape,
 * which is what makes the panel that shows it worth having: the two sums stay
 * equal however hard the player drags.
 */

export interface Demand {
  input: [number, number];
  /** XOR wants the neuron to fire here. */
  wantsOn: boolean;
  /** z, written in terms of the weights, for showing next to its value. */
  formula: string;
  /** The sum at this corner right now. */
  z: number;
  /** Whether the neuron's real output lands on the right side of 0.5. */
  ok: boolean;
}

export interface XorAnalysis {
  demands: Demand[];
  /** z(0,1) + z(1,0): the pair that must come out positive. */
  mustBePositive: number;
  /** z(0,0) + z(1,1): the pair that must come out negative. */
  mustBeNegative: number;
  correct: number;
}

const CORNERS: Array<Pick<Demand, 'input' | 'wantsOn' | 'formula'>> = [
  { input: [0, 0], wantsOn: false, formula: 'b' },
  { input: [0, 1], wantsOn: true, formula: 'w₂ + b' },
  { input: [1, 0], wantsOn: true, formula: 'w₁ + b' },
  { input: [1, 1], wantsOn: false, formula: 'w₁ + w₂ + b' },
];

/** True for exactly the shape the argument is about: two inputs, one neuron. */
export function isSingleNeuron(net: Network): boolean {
  return net.inputSize === 2 && net.layers.length === 1 && net.layers[0].biases.length === 1;
}

export function analyseXor(net: Network): XorAnalysis | null {
  if (!isSingleNeuron(net)) return null;

  const demands: Demand[] = CORNERS.map((corner) => {
    const trace = forward(net, corner.input);
    const output = trace.output[0];
    return {
      ...corner,
      z: trace.preActivations[0][0],
      // Judged on the real output, so this can never disagree with the truth
      // table sitting above it.
      ok: (output >= 0.5) === corner.wantsOn,
    };
  });

  return {
    demands,
    mustBePositive: demands[1].z + demands[2].z,
    mustBeNegative: demands[0].z + demands[3].z,
    correct: demands.filter((d) => d.ok).length,
  };
}
