import type { Activation, ActivationName } from './types';

/**
 * Activation functions — the "squash" applied to a neuron's weighted sum.
 *
 * Without one, stacking layers would be pointless: a chain of linear maps is
 * just another linear map, and the network could never draw anything but a
 * straight line. The squash is what buys us curves.
 */

/** Numerically stable logistic sigmoid. */
function sigmoid(z: number): number {
  // For very negative z, e^-z overflows. Flip the algebra instead.
  if (z >= 0) return 1 / (1 + Math.exp(-z));
  const e = Math.exp(z);
  return e / (1 + e);
}

export const activations: Record<ActivationName, Activation> = {
  step: {
    name: 'step',
    f: (z) => (z >= 0 ? 1 : 0),
    // Flat everywhere it exists, undefined at 0. Gradient descent has nothing
    // to hold on to, which is exactly why the field moved on from it.
    df: () => 0,
    range: [0, 1],
    trainable: false,
    blurb: 'All or nothing. Fires at full strength the moment the sum reaches zero.',
  },
  sigmoid: {
    name: 'sigmoid',
    f: sigmoid,
    df: (_z, a) => a * (1 - a),
    range: [0, 1],
    trainable: true,
    blurb: 'A soft switch. Squashes any sum into 0 to 1, steepest around zero.',
  },
  tanh: {
    name: 'tanh',
    f: (z) => Math.tanh(z),
    df: (_z, a) => 1 - a * a,
    range: [-1, 1],
    trainable: true,
    blurb: 'Like sigmoid but centred on zero, so it can output negative values.',
  },
  relu: {
    name: 'relu',
    f: (z) => (z > 0 ? z : 0),
    // Undefined at exactly 0; by convention we take the left-hand value.
    df: (z) => (z > 0 ? 1 : 0),
    range: [0, 6],
    trainable: true,
    blurb: 'Ignores everything below zero and passes the rest through unchanged.',
  },
  linear: {
    name: 'linear',
    f: (z) => z,
    df: () => 1,
    range: [-6, 6],
    trainable: true,
    blurb: 'No squash at all. Useful for comparison — and for seeing why it fails.',
  },
};

export const activationNames = Object.keys(activations) as ActivationName[];

export function getActivation(name: ActivationName): Activation {
  return activations[name];
}

/**
 * Map an activation value onto 0..1 so the UI can use it as a fill intensity
 * regardless of which function produced it.
 */
export function normalizeActivation(value: number, name: ActivationName): number {
  const [lo, hi] = activations[name].range;
  if (hi === lo) return 0;
  return Math.min(1, Math.max(0, (value - lo) / (hi - lo)));
}
