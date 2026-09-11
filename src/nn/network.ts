import { getActivation } from './activations';
import { gaussian, makeRng } from './rng';
import type { ActivationName, ForwardTrace, Layer, Network } from './types';

/**
 * Building, reading and editing networks.
 *
 * Every editing function returns a NEW network rather than mutating the old
 * one. That costs a few array copies per drag — irrelevant at this size — and
 * buys us trivially correct React re-renders plus free undo in the sandbox.
 */

export interface CreateOptions {
  /** Activation for every hidden layer. Default: sigmoid. */
  hidden?: ActivationName;
  /** Activation for the output layer. Default: same as `hidden`. */
  output?: ActivationName;
  /** Omit for a network of zeros; pass a seed for small random weights. */
  seed?: number;
}

/**
 * `shape` is [inputs, ...hidden, outputs]. So [2, 1] is a single neuron with
 * two inputs; [2, 2, 1] adds a hidden layer of two.
 */
export function createNetwork(shape: number[], opts: CreateOptions = {}): Network {
  if (shape.length < 2) throw new Error('A network needs at least an input and an output size.');
  const hidden = opts.hidden ?? 'sigmoid';
  const output = opts.output ?? hidden;
  const rng = opts.seed === undefined ? null : makeRng(opts.seed);

  const layers: Layer[] = [];
  for (let l = 1; l < shape.length; l++) {
    const fanIn = shape[l - 1];
    const size = shape[l];
    // Xavier-ish scaling keeps the starting sums in the interesting part of the
    // sigmoid instead of pinned at 0 or 1.
    const scale = Math.sqrt(2 / (fanIn + size));
    layers.push({
      weights: Array.from({ length: size }, () =>
        Array.from({ length: fanIn }, () => (rng ? gaussian(rng) * scale : 0)),
      ),
      biases: Array.from({ length: size }, () => 0),
      activation: l === shape.length - 1 ? output : hidden,
    });
  }
  return { inputSize: shape[0], layers };
}

/** [inputs, ...hidden, outputs] for an existing network. */
export function shapeOf(net: Network): number[] {
  return [net.inputSize, ...net.layers.map((l) => l.biases.length)];
}

export function outputSize(net: Network): number {
  return net.layers[net.layers.length - 1].biases.length;
}

export function countParams(net: Network): number {
  return net.layers.reduce(
    (total, l) => total + l.biases.length + l.weights.reduce((n, row) => n + row.length, 0),
    0,
  );
}

/**
 * The forward pass. This is the whole of "running" a neural network:
 * for each neuron, multiply every incoming activation by its weight, add them
 * up, add the bias, then squash. Repeat layer by layer.
 */
export function forward(net: Network, inputs: number[]): ForwardTrace {
  const activationsByLayer: number[][] = [inputs];
  const preActivations: number[][] = [];

  let current = inputs;
  for (const layer of net.layers) {
    const act = getActivation(layer.activation);
    const z: number[] = new Array(layer.biases.length);
    const a: number[] = new Array(layer.biases.length);

    for (let j = 0; j < layer.biases.length; j++) {
      const row = layer.weights[j];
      let sum = layer.biases[j];
      for (let i = 0; i < row.length; i++) sum += row[i] * current[i];
      z[j] = sum;
      a[j] = act.f(sum);
    }

    preActivations.push(z);
    activationsByLayer.push(a);
    current = a;
  }

  return { activations: activationsByLayer, preActivations, output: current };
}

/**
 * Same maths as `forward`, but allocates two arrays instead of 2n. The heatmap
 * calls this tens of thousands of times per repaint, so the difference matters.
 */
export function predict(net: Network, inputs: number[]): number[] {
  let current = inputs;
  for (const layer of net.layers) {
    const act = getActivation(layer.activation);
    const next: number[] = new Array(layer.biases.length);
    for (let j = 0; j < layer.biases.length; j++) {
      const row = layer.weights[j];
      let sum = layer.biases[j];
      for (let i = 0; i < row.length; i++) sum += row[i] * current[i];
      next[j] = act.f(sum);
    }
    current = next;
  }
  return current;
}

/* ------------------------------------------------------------------ *
 * Editing — all immutable
 * ------------------------------------------------------------------ */

function mapLayer(net: Network, index: number, fn: (l: Layer) => Layer): Network {
  return { ...net, layers: net.layers.map((l, i) => (i === index ? fn(l) : l)) };
}

export function setWeight(net: Network, layer: number, to: number, from: number, value: number): Network {
  return mapLayer(net, layer, (l) => ({
    ...l,
    weights: l.weights.map((row, j) => (j === to ? row.map((w, i) => (i === from ? value : w)) : row)),
  }));
}

export function setBias(net: Network, layer: number, to: number, value: number): Network {
  return mapLayer(net, layer, (l) => ({
    ...l,
    biases: l.biases.map((b, j) => (j === to ? value : b)),
  }));
}

export function getWeight(net: Network, layer: number, to: number, from: number): number {
  return net.layers[layer].weights[to][from];
}

export function getBias(net: Network, layer: number, to: number): number {
  return net.layers[layer].biases[to];
}

export function setActivation(net: Network, layer: number, name: ActivationName): Network {
  return mapLayer(net, layer, (l) => ({ ...l, activation: name }));
}

/** Set the activation of every hidden layer at once (leaves the output alone). */
export function setHiddenActivation(net: Network, name: ActivationName): Network {
  return {
    ...net,
    layers: net.layers.map((l, i) => (i === net.layers.length - 1 ? l : { ...l, activation: name })),
  };
}

export function randomize(net: Network, seed: number, spread = 1): Network {
  const rng = makeRng(seed);
  const sizes = shapeOf(net);
  return {
    ...net,
    layers: net.layers.map((l, index) => {
      const scale = spread * Math.sqrt(2 / (sizes[index] + sizes[index + 1]));
      return {
        ...l,
        weights: l.weights.map((row) => row.map(() => gaussian(rng) * scale)),
        biases: l.biases.map(() => gaussian(rng) * scale * 0.5),
      };
    }),
  };
}

/** Add one neuron to a hidden layer, wiring it in with zero weights. */
export function addNeuron(net: Network, layer: number): Network {
  const fanIn = layer === 0 ? net.inputSize : net.layers[layer - 1].biases.length;
  const withNeuron = mapLayer(net, layer, (l) => ({
    ...l,
    weights: [...l.weights, new Array(fanIn).fill(0)],
    biases: [...l.biases, 0],
  }));
  // The next layer now has one more incoming connection to account for.
  if (layer + 1 >= withNeuron.layers.length) return withNeuron;
  return mapLayer(withNeuron, layer + 1, (l) => ({
    ...l,
    weights: l.weights.map((row) => [...row, 0]),
  }));
}

export function removeNeuron(net: Network, layer: number, index: number): Network {
  if (net.layers[layer].biases.length <= 1) return net;
  const withoutNeuron = mapLayer(net, layer, (l) => ({
    ...l,
    weights: l.weights.filter((_, j) => j !== index),
    biases: l.biases.filter((_, j) => j !== index),
  }));
  if (layer + 1 >= withoutNeuron.layers.length) return withoutNeuron;
  return mapLayer(withoutNeuron, layer + 1, (l) => ({
    ...l,
    weights: l.weights.map((row) => row.filter((_, i) => i !== index)),
  }));
}

/** Insert a hidden layer before index `at`, sized `size`. */
export function addLayer(net: Network, at: number, size: number, activation?: ActivationName): Network {
  const fanIn = at === 0 ? net.inputSize : net.layers[at - 1].biases.length;
  const inserted: Layer = {
    weights: Array.from({ length: size }, () => new Array(fanIn).fill(0)),
    biases: new Array(size).fill(0),
    activation: activation ?? net.layers[Math.max(0, at - 1)].activation,
  };
  const layers = [...net.layers.slice(0, at), inserted, ...net.layers.slice(at)];
  // Re-wire whatever follows so its rows match the new fan-in.
  if (at < layers.length - 1) {
    const after = layers[at + 1];
    layers[at + 1] = {
      ...after,
      weights: after.weights.map(() => new Array(size).fill(0)),
    };
  }
  return { ...net, layers };
}

export function removeLayer(net: Network, layer: number): Network {
  if (net.layers.length <= 1 || layer === net.layers.length - 1) return net;
  const layers = net.layers.filter((_, i) => i !== layer);
  const fanIn = layer === 0 ? net.inputSize : layers[layer - 1].biases.length;
  layers[layer] = {
    ...layers[layer],
    weights: layers[layer].weights.map(() => new Array(fanIn).fill(0)),
  };
  return { ...net, layers };
}

export function cloneNetwork(net: Network): Network {
  return {
    inputSize: net.inputSize,
    layers: net.layers.map((l) => ({
      weights: l.weights.map((row) => [...row]),
      biases: [...l.biases],
      activation: l.activation,
    })),
  };
}
