import { useMemo } from 'react';
import css from './LossCurve.module.css';
import { compact, fixed } from '../lib/format';

export interface LossCurveProps {
  history: number[];
  step: number;
  /** Null until a run has started, so the readout can say "not yet". */
  accuracy: number | null;
  width?: number;
  height?: number;
}

/**
 * How wrong the network is, over time.
 *
 * The y axis is logarithmic, because loss falls by orders of magnitude: on a
 * straight scale the entire interesting part of a successful run is squashed
 * into the bottom pixel.
 */
export function LossCurve({ history, step, accuracy, width = 320, height = 104 }: LossCurveProps) {
  const path = useMemo(() => {
    if (history.length < 2) return '';
    const floor = 1e-4;
    const values = history.map((v) => Math.log10(Math.max(v, floor)));
    const hi = Math.max(...values);
    const lo = Math.min(...values);
    const span = Math.max(hi - lo, 0.35);
    return values
      .map((v, i) => {
        const x = (i / (values.length - 1)) * width;
        const y = height - ((v - lo) / span) * (height - 8) - 4;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');
  }, [history, width, height]);

  const latest = history.length ? history[history.length - 1] : 0;
  const first = history.length ? history[0] : 0;

  return (
    <div className={css.wrap}>
      <div className={css.head}>
        <span className="label">Loss</span>
        <span className="caption">log scale</span>
      </div>
      <svg
        className={css.chart}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={
          history.length > 1
            ? `Loss curve. Started at ${compact(first)}, now ${compact(latest)} after ${step} steps.`
            : 'Loss curve. Nothing recorded yet — press Train network.'
        }
      >
        <line className={css.grid} x1={0} y1={height - 4} x2={width} y2={height - 4} vectorEffect="non-scaling-stroke" />
        {path ? (
          <path className={css.line} d={path} />
        ) : (
          <text className={css.empty} x={10} y={height / 2}>
            Press Train network to start.
          </text>
        )}
      </svg>
      <div className={css.readouts}>
        <span className={css.readout}>
          <span className={css.readoutLabel}>loss</span>
          <span className={css.readoutValue}>{history.length ? compact(latest) : '—'}</span>
        </span>
        <span className={css.readout}>
          <span className={css.readoutLabel}>steps</span>
          <span className={css.readoutValue}>{history.length ? step : '—'}</span>
        </span>
        <span className={css.readout}>
          <span className={css.readoutLabel}>correct</span>
          <span className={css.readoutValue}>{accuracy === null ? '—' : `${fixed(accuracy * 100, 0)}%`}</span>
        </span>
      </div>
    </div>
  );
}
