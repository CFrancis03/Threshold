import { forward } from './network';
import type { Dataset } from './datasets';
import type { ActivationName, Network } from './types';

/**
 * What the output neuron actually sees.
 *
 * The output neuron never looks at the original inputs. It looks at what the
 * last hidden layer said about them. So if that layer has exactly two neurons,
 * we can plot every training point at (what hidden 1 said, what hidden 2 said)
 * and draw the output neuron's own straight line through *that* picture.
 *
 * This is the central idea of a hidden layer, made visible: in the original
 * square the classes are tangled, and in this one a straight line separates
 * them. The layer's whole job was to move the points there.
 */

export interface HiddenSpaceView {
  /** Just the output layer, taking the hidden activations as its inputs. */
  net: Network;
  /** The same points, at their hidden coordinates. */
  dataset: Dataset;
}

/** Padding around the plotted range, as a fraction of it. */
const PAD = 0.14;

function axisRange(activation: ActivationName, values: number[]): [number, number] {
  let lo: number;
  let hi: number;
  if (activation === 'sigmoid' || activation === 'step') {
    [lo, hi] = [0, 1];
  } else if (activation === 'tanh') {
    [lo, hi] = [-1, 1];
  } else {
    // ReLU and linear have no natural ceiling, so fit the data instead.
    lo = Math.min(0, ...values);
    hi = Math.max(1, ...values);
  }
  // Points can sit outside a squash's nominal range only through rounding, but
  // never let one be clipped off the edge.
  lo = Math.min(lo, ...values);
  hi = Math.max(hi, ...values);
  const pad = (hi - lo) * PAD;
  return [lo - pad, hi + pad];
}

export function hiddenSpaceView(net: Network, dataset: Dataset): HiddenSpaceView | null {
  const last = net.layers.length - 1;
  if (last < 1) return null; // no hidden layer at all
  if (net.inputSize !== 2) return null;
  if (net.layers[last - 1].biases.length !== 2) return null;
  if (net.layers[last].biases.length !== 1) return null;

  // activations[0] is the inputs, so the last hidden layer's output is at
  // index `last`.
  const points = dataset.points.map((p) => ({ x: forward(net, p.x).activations[last], y: p.y }));

  const activation = net.layers[last - 1].activation;
  const domain: Dataset['domain'] = [
    axisRange(activation, points.map((p) => p.x[0])),
    axisRange(activation, points.map((p) => p.x[1])),
  ];

  return {
    net: { inputSize: 2, layers: [net.layers[last]] },
    dataset: {
      id: 'hidden-space',
      label: 'Hidden space',
      kind: dataset.kind,
      domain,
      points,
    },
  };
}

/**
 * How many pairs of same-class points have landed on (nearly) the same spot.
 *
 * When the hidden layer solves XOR neatly, the two inputs that should fire end
 * up at exactly the same place, so only three marks are visible for four
 * points. That is worth pointing out rather than leaving as a puzzle: it means
 * the hidden layer has decided those two inputs are, for the output neuron's
 * purposes, the same input.
 *
 * Only same-class pairs count. Two points of different classes on top of each
 * other would be a failure, not a discovery.
 */
export function countCoincident(view: HiddenSpaceView, tolerance = 0.03): number {
  const [[x0, x1], [y0, y1]] = view.dataset.domain;
  const reach = tolerance * Math.max(x1 - x0, y1 - y0);
  const pts = view.dataset.points;
  let pairs = 0;
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      if ((pts[i].y[0] >= 0.5) !== (pts[j].y[0] >= 0.5)) continue;
      if (Math.hypot(pts[i].x[0] - pts[j].x[0], pts[i].x[1] - pts[j].x[1]) < reach) pairs++;
    }
  }
  return pairs;
}
