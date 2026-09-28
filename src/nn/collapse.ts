import type { ActivationName, Network } from './types';

/**
 * Why a stack of layers with no squash is one layer in disguise.
 *
 * The second layer multiplies what the first produced and adds its own bias:
 *
 *     second(first(x)) = W2 · (W1 · x + b1) + b2
 *                      = (W2 · W1) · x + (W2 · b1 + b2)
 *
 * which has exactly the form of a single layer, with weights W2 · W1 and bias
 * W2 · b1 + b2. Do it again for a third layer and the same thing happens. No
 * matter how deep, a network whose hidden layers have no squash can only ever
 * draw one straight line, which is the reason squashes exist.
 *
 * This function does the multiplication, so the claim can be shown and tested
 * rather than merely asserted.
 */
export function collapseLinear(net: Network): Network | null {
  const hidden = net.layers.slice(0, -1);
  if (!hidden.every((layer) => layer.activation === 'linear')) return null;

  let weights = net.layers[0].weights.map((row) => [...row]);
  let biases = [...net.layers[0].biases];

  for (let l = 1; l < net.layers.length; l++) {
    const layer = net.layers[l];
    const inputs = weights[0].length;
    const nextWeights = layer.weights.map((row) =>
      Array.from({ length: inputs }, (_, i) => row.reduce((sum, w, k) => sum + w * weights[k][i], 0)),
    );
    const nextBiases = layer.weights.map((row, j) =>
      row.reduce((sum, w, k) => sum + w * biases[k], layer.biases[j]),
    );
    weights = nextWeights;
    biases = nextBiases;
  }

  return {
    inputSize: net.inputSize,
    layers: [{ weights, biases, activation: net.layers[net.layers.length - 1].activation }],
  };
}

/**
 * A three-neuron network chosen so that squashing visibly matters: with tanh in
 * the hidden layer the boundary bends, and with no squash it is one straight
 * line, 10x - 7.5y + 1.42 = 0, however the three hidden neurons are wired.
 */
export function collapseDemoNet(hidden: Extract<ActivationName, 'linear' | 'tanh'>): Network {
  return {
    inputSize: 2,
    layers: [
      {
        weights: [
          [3, 1.5],
          [-2, 3],
          [1, -3],
        ],
        biases: [0.3, -0.4, 0.2],
        activation: hidden,
      },
      { weights: [[1.6, -1.9, 1.4]], biases: [-0.1], activation: 'sigmoid' },
    ],
  };
}
