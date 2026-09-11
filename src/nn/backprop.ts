import { getActivation } from './activations';
import { forward } from './network';
import { datasetLoss, loss, lossGrad, type LossName } from './loss';
import type { Gradients, Network, Sample } from './types';

/**
 * Backpropagation.
 *
 * The idea in one sentence: work out how much each parameter contributed to the
 * error, then nudge every parameter a little in the direction that shrinks it.
 *
 * Mechanically it is the chain rule run backwards through the layers. We
 * compute, for each neuron, a quantity conventionally called `delta`:
 *
 *     delta[j] = dLoss / dz[j]
 *
 * "if this neuron's weighted sum had been a touch larger, how much worse would
 * the answer have been?" Once we have delta for a neuron, its gradients fall
 * straight out:
 *
 *     dLoss/dWeight[j][i] = delta[j] * activation_of_the_neuron_feeding_it
 *     dLoss/dBias[j]      = delta[j]
 *
 * and the deltas for the layer before it are found by sending these deltas back
 * up the same weights the signal came down.
 */

export function zeroGradients(net: Network): Gradients {
  return {
    weights: net.layers.map((l) => l.weights.map((row) => new Array(row.length).fill(0))),
    biases: net.layers.map((l) => new Array(l.biases.length).fill(0)),
  };
}

/** Gradients of the loss for one training example. */
export function backprop(net: Network, sample: Sample, lossName: LossName = 'mse'): Gradients {
  const trace = forward(net, sample.x);
  const grads = zeroGradients(net);
  const last = net.layers.length - 1;

  // Step 1: how wrong is the final output, and how sensitive is it to its own
  // weighted sum? Multiply the two and we have delta for the output layer.
  let delta: number[] = lossGrad(lossName, trace.output, sample.y).map((dLdA, j) => {
    const act = getActivation(net.layers[last].activation);
    return dLdA * act.df(trace.preActivations[last][j], trace.activations[last + 1][j]);
  });

  // Step 2: walk backwards. At each layer, bank the gradients, then translate
  // this layer's deltas into the previous layer's deltas.
  for (let l = last; l >= 0; l--) {
    const layer = net.layers[l];
    const inputsToLayer = trace.activations[l]; // what fed this layer

    for (let j = 0; j < layer.biases.length; j++) {
      grads.biases[l][j] = delta[j];
      const row = layer.weights[j];
      for (let i = 0; i < row.length; i++) {
        grads.weights[l][j][i] = delta[j] * inputsToLayer[i];
      }
    }

    if (l === 0) break;

    // Send the blame backwards through the same weights that carried the signal
    // forwards, then scale by how responsive the earlier neuron was.
    const prev = net.layers[l - 1];
    const prevAct = getActivation(prev.activation);
    const nextDelta: number[] = new Array(prev.biases.length).fill(0);
    for (let i = 0; i < prev.biases.length; i++) {
      let sum = 0;
      for (let j = 0; j < layer.biases.length; j++) sum += layer.weights[j][i] * delta[j];
      nextDelta[i] = sum * prevAct.df(trace.preActivations[l - 1][i], trace.activations[l][i]);
    }
    delta = nextDelta;
  }

  return grads;
}

export function addGrads(a: Gradients, b: Gradients): Gradients {
  return {
    weights: a.weights.map((layer, l) => layer.map((row, j) => row.map((v, i) => v + b.weights[l][j][i]))),
    biases: a.biases.map((row, l) => row.map((v, j) => v + b.biases[l][j])),
  };
}

export function scaleGrads(g: Gradients, k: number): Gradients {
  return {
    weights: g.weights.map((layer) => layer.map((row) => row.map((v) => v * k))),
    biases: g.biases.map((row) => row.map((v) => v * k)),
  };
}

/** Average gradient across a batch of examples. */
export function batchGradients(net: Network, data: Sample[], lossName: LossName = 'mse'): Gradients {
  if (data.length === 0) return zeroGradients(net);
  let total = backprop(net, data[0], lossName);
  for (let i = 1; i < data.length; i++) total = addGrads(total, backprop(net, data[i], lossName));
  return scaleGrads(total, 1 / data.length);
}

/** The actual learning step: move every parameter downhill. */
export function applyGradients(net: Network, g: Gradients, learningRate: number): Network {
  return {
    ...net,
    layers: net.layers.map((layer, l) => ({
      ...layer,
      weights: layer.weights.map((row, j) => row.map((w, i) => w - learningRate * g.weights[l][j][i])),
      biases: layer.biases.map((b, j) => b - learningRate * g.biases[l][j]),
    })),
  };
}

/** Largest absolute gradient — used to show "how hard is training pulling?". */
export function gradientMagnitude(g: Gradients): number {
  let max = 0;
  for (const layer of g.weights) for (const row of layer) for (const v of row) max = Math.max(max, Math.abs(v));
  for (const row of g.biases) for (const v of row) max = Math.max(max, Math.abs(v));
  return max;
}

/**
 * Gradients measured the slow, obvious way: nudge a parameter by a hair, see
 * how much the loss moved, divide. Far too slow to train with, but it depends
 * on none of the calculus above — which makes it the perfect way to prove that
 * `backprop` is correct. The tests check the two agree.
 */
export function numericalGradients(
  net: Network,
  data: Sample | Sample[],
  lossName: LossName = 'mse',
  eps = 1e-5,
): Gradients {
  const batch = Array.isArray(data) ? data : [data];
  const measure = (n: Network) =>
    batch.length === 1 ? loss(lossName, forward(n, batch[0].x).output, batch[0].y) : datasetLoss(n, batch, lossName);

  const g = zeroGradients(net);
  const probe = (get: () => number, set: (v: number) => void): number => {
    const original = get();
    set(original + eps);
    const up = measure(net);
    set(original - eps);
    const down = measure(net);
    set(original);
    return (up - down) / (2 * eps);
  };

  // This one function is allowed to mutate, because it always puts the value
  // back before returning and never escapes this module.
  for (let l = 0; l < net.layers.length; l++) {
    const layer = net.layers[l];
    for (let j = 0; j < layer.biases.length; j++) {
      g.biases[l][j] = probe(
        () => layer.biases[j],
        (v) => (layer.biases[j] = v),
      );
      for (let i = 0; i < layer.weights[j].length; i++) {
        g.weights[l][j][i] = probe(
          () => layer.weights[j][i],
          (v) => (layer.weights[j][i] = v),
        );
      }
    }
  }
  return g;
}
