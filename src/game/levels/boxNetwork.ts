import { createNetwork, setBias, setWeight } from '../../nn/network';
import type { ActivationName, Network } from '../../nn/types';

/**
 * The four-detector network shared by levels 5 and 6.
 *
 * Each hidden neuron owns one direction and draws one straight line facing
 * inwards. The output neuron fires only when all four agree, which turns four
 * straight lines into a closed region — the whole point of a hidden layer.
 */

/** Inward-facing normals: below, left of, above, right of. */
const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, -1],
  [-1, 0],
  [0, 1],
  [1, 0],
];

export const DETECTOR_NAMES = ['top edge', 'right edge', 'bottom edge', 'left edge'];

export interface BoxOptions {
  hidden?: ActivationName;
  /** Steepness of each line. */
  weight?: number;
  /** How far each line sits from the centre, in input units. */
  offset?: number;
  outputWeight?: number;
  outputBias?: number;
}

export function boxNetwork({
  hidden = 'sigmoid',
  weight = 10,
  offset = 0,
  outputWeight = 8,
  outputBias = -28,
}: BoxOptions = {}): Network {
  let net = createNetwork([2, 4, 1], { hidden, output: 'sigmoid' });
  DIRECTIONS.forEach(([nx, ny], j) => {
    net = setWeight(net, 0, j, 0, nx * weight);
    net = setWeight(net, 0, j, 1, ny * weight);
    // bias = weight * offset puts the line `offset` away from the centre.
    net = setBias(net, 0, j, weight * offset);
    net = setWeight(net, 1, 0, j, outputWeight);
  });
  return setBias(net, 1, 0, outputBias);
}
