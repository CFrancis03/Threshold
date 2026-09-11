import { getActivation } from './activations';
import { predict } from './network';
import type { ActivationName, Network } from './types';

/**
 * Sampling the network across a 2-D input space, so we can paint the shape of
 * its decision boundary as an image.
 *
 * This is the expensive part of the whole app: a 160x160 field is 25,600
 * forward passes. We keep it cheap by reusing buffers and by sampling coarsely
 * while the player is dragging, then refining once they stop.
 */

export interface FieldRequest {
  domain: [[number, number], [number, number]];
  resolution: number;
  /** Which output neuron to read. */
  outputIndex?: number;
  /** Read a hidden neuron's activation instead of the network output. */
  probe?: { layer: number; neuron: number };
  /** Reuse this buffer if it is the right size. */
  into?: Float32Array;
}

/**
 * Returns a row-major field of values already normalised to 0..1, where 0.5 is
 * the decision threshold. Row 0 is the TOP of the image (max y), matching the
 * way canvas pixels are laid out.
 */
export function sampleField(net: Network, req: FieldRequest): Float32Array {
  const { domain, resolution, outputIndex = 0, probe } = req;
  const size = resolution * resolution;
  const field = req.into && req.into.length === size ? req.into : new Float32Array(size);

  const [[x0, x1], [y0, y1]] = domain;
  const dx = (x1 - x0) / (resolution - 1);
  const dy = (y1 - y0) / (resolution - 1);

  const readActivation: ActivationName = probe
    ? net.layers[probe.layer].activation
    : net.layers[net.layers.length - 1].activation;
  const [lo, hi] = getActivation(readActivation).range;
  const span = hi - lo || 1;

  // Reused input array: allocating one per pixel would dominate the cost.
  const input = [0, 0];

  for (let row = 0; row < resolution; row++) {
    input[1] = y1 - row * dy;
    for (let col = 0; col < resolution; col++) {
      input[0] = x0 + col * dx;
      let value: number;
      if (probe) {
        value = activationAt(net, input, probe.layer, probe.neuron);
      } else {
        value = predict(net, input)[outputIndex];
      }
      field[row * resolution + col] = Math.min(1, Math.max(0, (value - lo) / span));
    }
  }
  return field;
}

/** Forward pass that stops early, for hidden-neuron mini-heatmaps. */
function activationAt(net: Network, inputs: number[], layer: number, neuron: number): number {
  let current = inputs;
  for (let l = 0; l <= layer; l++) {
    const lay = net.layers[l];
    const act = getActivation(lay.activation);
    const next: number[] = new Array(lay.biases.length);
    for (let j = 0; j < lay.biases.length; j++) {
      const row = lay.weights[j];
      let sum = lay.biases[j];
      for (let i = 0; i < row.length; i++) sum += row[i] * current[i];
      next[j] = act.f(sum);
    }
    current = next;
  }
  return current[neuron];
}

/** Map a data-space point into pixel coordinates for a given box. */
export function toPixel(
  x: number,
  y: number,
  domain: [[number, number], [number, number]],
  width: number,
  height: number,
): [number, number] {
  const [[x0, x1], [y0, y1]] = domain;
  return [((x - x0) / (x1 - x0)) * width, ((y1 - y) / (y1 - y0)) * height];
}

/** Map pixel coordinates back into data space (used for click-to-place points). */
export function fromPixel(
  px: number,
  py: number,
  domain: [[number, number], [number, number]],
  width: number,
  height: number,
): [number, number] {
  const [[x0, x1], [y0, y1]] = domain;
  return [x0 + (px / width) * (x1 - x0), y1 - (py / height) * (y1 - y0)];
}
