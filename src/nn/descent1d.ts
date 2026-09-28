/**
 * Gradient descent on one weight, small enough to see whole.
 *
 * Imagine a network with a single weight and nothing else. Plot how wrong it is
 * against that weight and, for a squared-error loss, you get a bowl. Training
 * is a ball rolling down it: at each step, look at the slope where you are and
 * move a little way downhill.
 *
 * Real networks have hundreds of weights, so their loss is a landscape with
 * hundreds of directions rather than one — but at any moment each weight only
 * cares about its own slope, which is why this one-weight version teaches the
 * real thing.
 */

/** Where the bowl bottoms out: the best possible weight. */
export const BOWL_BOTTOM = 2;

/** Where the ball starts, on the left wall. */
export const START_WEIGHT = -0.6;

export const loss1d = (w: number): number => (w - BOWL_BOTTOM) ** 2;

/** The slope, by calculus: the derivative of (w - 2)². */
export const slope1d = (w: number): number => 2 * (w - BOWL_BOTTOM);

/**
 * The slope, measured the way you would with no calculus at all: nudge the
 * weight a hair each way, see how much the loss moved, divide. This is exactly
 * what "numerical gradient" means, and it is what backpropagation replaces with
 * something much cheaper when there are hundreds of weights to measure.
 */
export function measuredSlope(w: number, nudge = 1e-4): number {
  return (loss1d(w + nudge) - loss1d(w - nudge)) / (2 * nudge);
}

/** One step: move against the slope, by learning rate times its size. */
export const stepOnce = (w: number, learningRate: number): number => w - learningRate * slope1d(w);

/**
 * Each step multiplies the distance from the bottom by (1 - 2·lr). Everything
 * interesting about the learning rate is in that one number:
 *
 *   between 0 and 1     the ball approaches the bottom from one side
 *   exactly 0           it lands on the bottom in a single step (lr = 0.5)
 *   between -1 and 0    it overshoots to the far side, each time by less
 *   -1 or beyond        it overshoots by as much or more, and never settles
 */
export type Behaviour = 'crawls' | 'settles' | 'bounces' | 'overshoots';

/** Below this, twenty steps still leave the ball more than 5% of the way out. */
export const CRAWL_BELOW = 0.07;

export function behaviourFor(learningRate: number): Behaviour {
  if (learningRate < CRAWL_BELOW) return 'crawls';
  if (learningRate <= 0.5) return 'settles';
  if (learningRate < 1) return 'bounces';
  return 'overshoots';
}

export interface Run {
  path: number[];
  /** Stopped early because the ball left the chart for good. */
  flewOff: boolean;
}

/** Follow the ball for up to `steps` steps, stopping if it flies off to infinity. */
export function runDescent(start: number, learningRate: number, steps: number, limit = 1e6): Run {
  const path = [start];
  let w = start;
  for (let i = 0; i < steps; i++) {
    w = stepOnce(w, learningRate);
    path.push(w);
    if (!Number.isFinite(w) || Math.abs(w) > limit) return { path, flewOff: true };
  }
  return { path, flewOff: false };
}
