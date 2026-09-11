/**
 * Core types for the tiny neural network engine.
 *
 * Everything here is plain data — no classes, no hidden state. A `Network` is
 * just numbers in arrays, which means we can store it in React state, diff it,
 * serialise it to localStorage, and reason about it in tests without ceremony.
 */

export type ActivationName = 'step' | 'sigmoid' | 'tanh' | 'relu' | 'linear';

export interface Activation {
  name: ActivationName;
  /** The function itself: turns a pre-activation `z` into an activation `a`. */
  f: (z: number) => number;
  /**
   * The derivative da/dz. We pass both `z` and `a = f(z)` because for sigmoid
   * and tanh the derivative is much cheaper to compute from `a`.
   */
  df: (z: number, a: number) => number;
  /** Output range, used to scale the neuron fill and the boundary heatmap. */
  range: readonly [number, number];
  /**
   * The step function has a derivative of zero everywhere it is defined, so
   * gradient descent cannot learn through it. The UI uses this flag to explain
   * why the "Train" button is unavailable rather than silently failing.
   */
  trainable: boolean;
  /** One plain sentence, shown in the activation picker. */
  blurb: string;
}

export interface Layer {
  /**
   * weights[j][i] — the weight carrying unit `i` of the previous layer into
   * unit `j` of this layer. Row per destination neuron; that ordering matches
   * how we read the network on screen (each neuron owns its incoming edges).
   */
  weights: number[][];
  /** biases[j] — one per neuron in this layer. */
  biases: number[];
  activation: ActivationName;
}

export interface Network {
  inputSize: number;
  /** Hidden layers followed by the output layer. `layers.at(-1)` is the output. */
  layers: Layer[];
}

/** Everything the forward pass saw, kept so the UI and backprop can reuse it. */
export interface ForwardTrace {
  /** activations[0] is the input vector; activations[l + 1] is layer l's output. */
  activations: number[][];
  /** preActivations[l] is the weighted sum + bias for each neuron of layer l. */
  preActivations: number[][];
  /** Convenience alias for the final layer's activations. */
  output: number[];
}

/** One training example: inputs and the value(s) we want out. */
export interface Sample {
  x: number[];
  y: number[];
}

/** Gradients mirror the network's shape exactly, one number per parameter. */
export interface Gradients {
  weights: number[][][];
  biases: number[][];
}

/** Addresses a single tunable parameter, used by the UI for focus and editing. */
export type ParamRef =
  | { kind: 'weight'; layer: number; to: number; from: number }
  | { kind: 'bias'; layer: number; to: number };
