import { describe, expect, it } from 'vitest';
import { countCoincident, hiddenSpaceView } from '../hiddenSpace';
import { createNetwork, forward, predict, setActivation } from '../network';
import { XOR } from '../datasets';
import { level4 } from '../../game/levels/level4';

describe('hidden space', () => {
  it('needs exactly two hidden neurons and one output', () => {
    expect(hiddenSpaceView(createNetwork([2, 1]), XOR)).toBeNull();
    expect(hiddenSpaceView(createNetwork([2, 3, 1]), XOR)).toBeNull();
    expect(hiddenSpaceView(createNetwork([2, 2, 2]), XOR)).toBeNull();
    expect(hiddenSpaceView(createNetwork([3, 2, 1]), XOR)).toBeNull();
    expect(hiddenSpaceView(createNetwork([2, 2, 1]), XOR)).not.toBeNull();
  });

  it('places each point at what the two hidden neurons said about it', () => {
    const net = level4.solution();
    const view = hiddenSpaceView(net, XOR)!;
    expect(view.dataset.points).toHaveLength(4);
    view.dataset.points.forEach((p, i) => {
      const hidden = forward(net, XOR.points[i].x).activations[1];
      expect(p.x[0]).toBeCloseTo(hidden[0], 12);
      expect(p.x[1]).toBeCloseTo(hidden[1], 12);
      // Labels travel with their points.
      expect(p.y).toEqual(XOR.points[i].y);
    });
  });

  it('is the picture in which XOR stops being tangled: one line splits the classes', () => {
    // The output neuron, fed the hidden coordinates directly, must reproduce
    // the labels. That is what "a straight line separates them here" means.
    const view = hiddenSpaceView(level4.solution(), XOR)!;
    for (const p of view.dataset.points) {
      const out = predict(view.net, p.x)[0];
      expect(out >= 0.5).toBe(p.y[0] >= 0.5);
    }
  });

  it('the sub-network gives the same answers as the whole network', () => {
    const net = createNetwork([2, 2, 1], { seed: 19 });
    const view = hiddenSpaceView(net, XOR)!;
    XOR.points.forEach((p, i) => {
      const whole = predict(net, p.x)[0];
      const viaHidden = predict(view.net, view.dataset.points[i].x)[0];
      expect(viaHidden).toBeCloseTo(whole, 12);
    });
  });

  it('works from the last hidden layer of a deeper network', () => {
    const net = createNetwork([2, 4, 2, 1], { seed: 3 });
    const view = hiddenSpaceView(net, XOR)!;
    XOR.points.forEach((p, i) => {
      const acts = forward(net, p.x).activations;
      expect(view.dataset.points[i].x).toEqual(acts[acts.length - 2]);
    });
  });

  it('frames sigmoid coordinates in 0..1 and tanh coordinates in -1..1, with room around them', () => {
    const sig = hiddenSpaceView(createNetwork([2, 2, 1], { seed: 1 }), XOR)!;
    expect(sig.dataset.domain[0][0]).toBeLessThan(0);
    expect(sig.dataset.domain[0][1]).toBeGreaterThan(1);

    const tanh = hiddenSpaceView(
      setActivation(createNetwork([2, 2, 1], { seed: 1 }), 0, 'tanh'),
      XOR,
    )!;
    expect(tanh.dataset.domain[0][0]).toBeLessThan(-1);
    expect(tanh.dataset.domain[0][1]).toBeGreaterThan(1);
  });

  it('never clips a point off the edge, even for an unbounded squash', () => {
    const net = setActivation(createNetwork([2, 2, 1], { seed: 5 }), 0, 'relu');
    const view = hiddenSpaceView(net, XOR)!;
    for (const p of view.dataset.points) {
      for (const axis of [0, 1]) {
        expect(p.x[axis]).toBeGreaterThanOrEqual(view.dataset.domain[axis][0]);
        expect(p.x[axis]).toBeLessThanOrEqual(view.dataset.domain[axis][1]);
      }
    }
  });
});

describe('points that land on top of each other', () => {
  it('finds the two inputs XOR wants fired, sitting on the same spot in the solved network', () => {
    const view = hiddenSpaceView(level4.solution(), XOR)!;
    expect(countCoincident(view)).toBe(1);
  });

  it('finds none in a network that has not sorted anything out yet', () => {
    const view = hiddenSpaceView(createNetwork([2, 2, 1], { seed: 19 }), XOR)!;
    expect(countCoincident(view)).toBe(0);
  });

  it('ignores different-class points on top of each other, which would be a failure not a discovery', () => {
    // A network whose hidden layer does nothing: everything lands on one spot.
    const flat = hiddenSpaceView(createNetwork([2, 2, 1]), XOR)!;
    // Four points, all identical: six pairs, but only the same-class ones count
    // (the two zeros, and the two ones).
    expect(countCoincident(flat)).toBe(2);
  });
});
