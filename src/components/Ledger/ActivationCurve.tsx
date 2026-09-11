import { useMemo } from 'react';
import { getActivation } from '../../nn/activations';
import type { ActivationName } from '../../nn/types';
import css from './Ledger.module.css';

export interface ActivationCurveProps {
  activation: ActivationName;
  /** The weighted sum arriving at the neuron. */
  z: number;
  /** The activation that came out. */
  a: number;
  width?: number;
  height?: number;
  /** The line the game measures against, in output units. */
  threshold?: number;
}

const Z_RANGE = 6;

/**
 * The squash, drawn, with a dot showing exactly where this neuron is sitting
 * on it right now. Drag a weight and the dot slides.
 */
export function ActivationCurve({
  activation,
  z,
  a,
  width = 236,
  height = 74,
  threshold = 0.5,
}: ActivationCurveProps) {
  const act = getActivation(activation);
  const [lo, hi] = act.range;

  const toX = (zv: number) => ((zv + Z_RANGE) / (Z_RANGE * 2)) * width;
  const toY = (av: number) => height - ((av - lo) / (hi - lo || 1)) * height;

  const path = useMemo(() => {
    const steps = 120;
    let d = '';
    for (let i = 0; i <= steps; i++) {
      const zv = -Z_RANGE + (i / steps) * Z_RANGE * 2;
      const av = act.f(zv);
      // The step function is a genuine jump; drawing it with a line-to would
      // invent a diagonal that does not exist.
      d += i === 0 ? `M ${toX(zv).toFixed(2)} ${toY(av).toFixed(2)}` : ` L ${toX(zv).toFixed(2)} ${toY(av).toFixed(2)}`;
    }
    return d;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activation, width, height]);

  const clampedZ = Math.max(-Z_RANGE, Math.min(Z_RANGE, z));
  const dotX = toX(clampedZ);
  const dotY = toY(a);
  const thresholdY = toY(threshold);
  const showThreshold = threshold > lo && threshold < hi;

  return (
    <svg
      className={css.curve}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      aria-hidden="true"
    >
      <line className={css.curveAxis} x1={toX(0)} y1={0} x2={toX(0)} y2={height} />
      {showThreshold && (
        <line className={css.curveThreshold} x1={0} y1={thresholdY} x2={width} y2={thresholdY} />
      )}
      <path className={css.curveLine} d={path} />
      <line className={css.curveDrop} x1={dotX} y1={dotY} x2={dotX} y2={height} />
      <circle className={css.curveDot} cx={dotX} cy={dotY} r={4.5} />
      {/* Two tiny anchors, so the picture is readable without a caption:
          where zero is on the way in, and where the threshold is on the way
          out. */}
      <text className={css.curveTick} x={toX(0) - 4} y={height - 3} textAnchor="end">
        z = 0
      </text>
      {showThreshold && (
        <text className={css.curveTick} x={width - 2} y={thresholdY - 5} textAnchor="end">
          {threshold.toFixed(1)}
        </text>
      )}
    </svg>
  );
}
