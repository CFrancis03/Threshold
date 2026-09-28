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

export interface WeightArrow {
  /** On the boundary line, in the middle of the part you can see. */
  from: [number, number];
  /** Where the arrow points: the side of the line that makes the neuron fire. */
  to: [number, number];
}

/**
 * Which way the weights point, as an arrow standing on the decision boundary.
 *
 * For a single neuron the boundary is the line w1·x + w2·y + b = 0, and the
 * weight vector (w1, w2) is exactly perpendicular to it, aimed at the side
 * where the neuron fires. Change the weights and the line swings round to stay
 * square to the arrow; change the bias and the line slides along it. Drawing
 * the arrow makes that visible, which is much easier to believe than to be
 * told.
 *
 * Only defined for one neuron whose boundary sits at z = 0 (sigmoid or step).
 * Returns null when there is nothing sensible to draw.
 */
export function weightArrow(
  net: Network,
  domain: [[number, number], [number, number]],
  lengthFraction = 0.26,
): WeightArrow | null {
  if (net.inputSize !== 2 || net.layers.length !== 1 || net.layers[0].biases.length !== 1) return null;
  const { activation, weights, biases } = net.layers[0];
  if (activation !== 'sigmoid' && activation !== 'step') return null;

  const [w1, w2] = weights[0];
  const b = biases[0];
  const norm2 = w1 * w1 + w2 * w2;
  if (norm2 < 1e-9) return null;
  const norm = Math.sqrt(norm2);

  const [[x0, x1], [y0, y1]] = domain;

  // A point on the line: the foot of the perpendicular from the origin.
  const px = (-b * w1) / norm2;
  const py = (-b * w2) / norm2;
  // The line runs at right angles to the weights.
  const dx = -w2 / norm;
  const dy = w1 / norm;

  // Clip the line to the picture and take the middle of what is left, so the
  // arrow always stands on a part of the boundary you can actually see — even
  // for a steep line that misses the centre of the square entirely.
  let tMin = -Infinity;
  let tMax = Infinity;
  const clip = (p: number, d: number, lo: number, hi: number): boolean => {
    if (Math.abs(d) < 1e-12) return p >= lo && p <= hi;
    const t1 = (lo - p) / d;
    const t2 = (hi - p) / d;
    tMin = Math.max(tMin, Math.min(t1, t2));
    tMax = Math.min(tMax, Math.max(t1, t2));
    return true;
  };
  if (!clip(px, dx, x0, x1) || !clip(py, dy, y0, y1) || tMin > tMax) return null;

  const t = (tMin + tMax) / 2;
  const fromX = px + dx * t;
  const fromY = py + dy * t;

  const ux = w1 / norm;
  const uy = w2 / norm;
  let length = lengthFraction * Math.min(x1 - x0, y1 - y0);
  // Keep the tip inside the picture.
  for (let i = 0; i < 16; i++) {
    const tx = fromX + ux * length;
    const ty = fromY + uy * length;
    if (tx >= x0 && tx <= x1 && ty >= y0 && ty <= y1) break;
    length *= 0.8;
  }

  return { from: [fromX, fromY], to: [fromX + ux * length, fromY + uy * length] };
}
