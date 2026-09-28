import { useEffect, useId, useState } from 'react';
import css from './GradientDescent1D.module.css';
import { Button, Slider } from './ui/Controls';
import {
  BOWL_BOTTOM,
  START_WEIGHT,
  behaviourFor,
  loss1d,
  measuredSlope,
  slope1d,
  stepOnce,
  type Behaviour,
} from '../nn/descent1d';
import { clamp, fixed, signed, spoken } from '../lib/format';

const W_MIN = -1;
const W_MAX = 5;
const L_MAX = 10;
const WIDTH = 340;
const HEIGHT = 196;
const PAD = { left: 10, right: 10, top: 12, bottom: 38 };
const TICK_MS = 380;
const MAX_STEPS = 60;
/** Beyond this the ball is nowhere near the chart, and never coming back. */
const OFF_CHART = 30;

const plotW = WIDTH - PAD.left - PAD.right;
const plotH = HEIGHT - PAD.top - PAD.bottom;
/** Not clamped: things drawn with this are trimmed by the clip path instead. */
const xRaw = (w: number) => PAD.left + ((w - W_MIN) / (W_MAX - W_MIN)) * plotW;
const xOf = (w: number) => xRaw(clamp(w, W_MIN, W_MAX));
/** Not clamped: the clip path trims anything that runs off the top. */
const yRaw = (loss: number) => HEIGHT - PAD.bottom - (loss / L_MAX) * plotH;
const yOf = (loss: number) => yRaw(Math.min(loss, L_MAX));

const BOWL_PATH = Array.from({ length: 81 }, (_, i) => {
  const w = W_MIN + (i / 80) * (W_MAX - W_MIN);
  return `${i === 0 ? 'M' : 'L'} ${xOf(w).toFixed(2)} ${yOf(loss1d(w)).toFixed(2)}`;
}).join(' ');

const MESSAGE: Record<Behaviour, string> = {
  crawls: 'Too small. Every step is tiny, so getting anywhere takes for ever.',
  settles: 'About right. Big steps while the slope is steep, smaller ones as it flattens out.',
  bounces:
    'Getting big. Each step overshoots the bottom and lands on the far wall, but a little lower each time, so it does settle.',
  overshoots: 'Too big. Each step lands as far up the far wall as it started, or further, so it never settles.',
};

interface Ball {
  w: number;
  trail: number[];
  count: number;
}

const fresh = (w: number): Ball => ({ w, trail: [w], count: 0 });

/**
 * Gradient descent on a single weight, where you can see all of it.
 *
 * The loss is a bowl, the ball is the weight, and one step means: look at the
 * slope where you are, and move against it by learning rate times its size.
 * That is the whole of training. A real network does this to hundreds of
 * weights at once, but each of them only ever consults its own slope.
 *
 * The slope shown is measured by nudging the weight a hair either way — no
 * calculus — and compared with the calculus answer, to show they agree.
 */
export function GradientDescent1D() {
  const [learningRate, setLearningRate] = useState(0.3);
  const [ball, setBall] = useState<Ball>(() => fresh(START_WEIGHT));
  const [running, setRunning] = useState(false);
  const clipId = useId();
  const arrowId = useId();

  const { w, count } = ball;
  const flewOff = !Number.isFinite(w) || Math.abs(w) > OFF_CHART;
  const slope = flewOff ? 0 : slope1d(w);
  const settled = !flewOff && Math.abs(slope) < 0.01;
  const next = flewOff ? w : stepOnce(w, learningRate);
  const behaviour = behaviourFor(learningRate);
  const halfway = Math.abs(learningRate - 0.5) < 0.005;

  const advance = () =>
    setBall((b) => {
      const to = stepOnce(b.w, learningRate);
      return { w: to, trail: [...b.trail, to].slice(-40), count: b.count + 1 };
    });

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(advance, TICK_MS);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, learningRate]);

  // Stop when there is nothing left to watch.
  useEffect(() => {
    if (running && (settled || flewOff || count >= MAX_STEPS)) setRunning(false);
  }, [running, settled, flewOff, count]);

  const message = flewOff
    ? 'It has flown off the chart. That is what a learning rate that is too high looks like.'
    : settled
      ? 'Settled at the bottom. The slope is zero here, so there is nowhere further downhill to go.'
      : halfway
        ? 'Exactly half. For a bowl this regular, one step lands on the bottom.'
        : MESSAGE[behaviour];

  const tangentHalf = 0.8;
  const dot = flewOff ? null : { x: xOf(w), y: yOf(loss1d(w)) };
  const ghost = flewOff ? null : { x: xOf(next), y: yOf(loss1d(next)) };
  const stepLength = Math.abs(xOf(next) - xOf(w));

  return (
    <div className={css.wrap}>
      <svg
        className={css.chart}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={
          flewOff
            ? 'A bowl-shaped loss curve. The ball has flown off the chart.'
            : `A bowl-shaped loss curve with its lowest point at weight ${BOWL_BOTTOM}. The ball is at weight ${spoken(w)}, where the loss is ${fixed(loss1d(w))} and the slope is ${spoken(slope)}. Its next step would take it to ${spoken(next)}.`
        }
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={PAD.left} y={PAD.top} width={plotW} height={plotH} />
          </clipPath>
          <marker id={arrowId} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0 0 L8 4 L0 8 z" className={css.arrowHead} />
          </marker>
        </defs>

        <line className={css.axis} x1={PAD.left} y1={yOf(0)} x2={WIDTH - PAD.right} y2={yOf(0)} />
        <path className={css.bowl} d={BOWL_PATH} />

        <line className={css.best} x1={xOf(BOWL_BOTTOM)} y1={yOf(0)} x2={xOf(BOWL_BOTTOM)} y2={yOf(0) + 6} />
        <text className={css.tick} x={xOf(BOWL_BOTTOM)} y={yOf(0) + 18} textAnchor="middle">
          best weight
        </text>
        <text className={css.tick} x={WIDTH - PAD.right} y={HEIGHT - 6} textAnchor="end">
          weight →
        </text>
        <text className={css.tick} x={WIDTH / 2} y={PAD.top + 8} textAnchor="middle">
          loss ↑
        </text>

        {!flewOff && (
          <g clipPath={`url(#${clipId})`}>
            <line
              className={slope >= 0 ? css.tangentPos : css.tangentNeg}
              x1={xRaw(w - tangentHalf)}
              y1={yRaw(loss1d(w) - tangentHalf * slope)}
              x2={xRaw(w + tangentHalf)}
              y2={yRaw(loss1d(w) + tangentHalf * slope)}
            />
          </g>
        )}

        {/* How far the next step goes, along the ground. */}
        {!flewOff && !settled && stepLength > 6 && (
          <line
            className={css.step}
            x1={xOf(w)}
            y1={yOf(0) - 8}
            x2={xOf(next)}
            y2={yOf(0) - 8}
            markerEnd={`url(#${arrowId})`}
          />
        )}

        {ball.trail.slice(0, -1).map((t, i, all) => (
          <circle
            key={i}
            className={css.trail}
            cx={xOf(t)}
            cy={yOf(loss1d(t))}
            r={2.6}
            opacity={0.18 + 0.5 * ((i + 1) / all.length)}
          />
        ))}

        {ghost && !settled && <circle className={css.ghost} cx={ghost.x} cy={ghost.y} r={6} />}
        {dot && (
          <circle
            className={w < W_MIN || w > W_MAX ? css.ballOff : css.ball}
            cx={dot.x}
            cy={dot.y}
            r={6.5}
          />
        )}
      </svg>

      <div className={css.buttons}>
        <Button size="small" onClick={advance} disabled={settled || flewOff}>
          Take a step
        </Button>
        <Button
          size="small"
          variant={running ? 'default' : 'primary'}
          onClick={() => setRunning((r) => !r)}
          disabled={settled || flewOff}
        >
          {running ? 'Pause' : 'Keep going'}
        </Button>
        <Button
          size="small"
          onClick={() => {
            setRunning(false);
            setBall(fresh(START_WEIGHT));
          }}
        >
          Start again
        </Button>
      </div>

      <div className={css.controls}>
        <Slider
          label="Learning rate"
          value={learningRate}
          min={0.02}
          max={1.2}
          step={0.01}
          hideNumber
          compact
          note={<span className="num">{fixed(learningRate)}</span>}
          onChange={setLearningRate}
        />
        <Slider
          label="Start the ball at weight"
          value={clamp(w, W_MIN, W_MAX)}
          min={W_MIN}
          max={W_MAX}
          step={0.05}
          hideNumber
          compact
          note={<span className="num">{flewOff ? '—' : fixed(w)}</span>}
          onChange={(v) => {
            setRunning(false);
            setBall(fresh(v));
          }}
        />
      </div>

      <dl className={css.readouts}>
        <div>
          <dt>weight</dt>
          <dd>{flewOff ? '—' : fixed(w)}</dd>
        </div>
        <div>
          <dt>loss</dt>
          <dd>{flewOff ? '—' : fixed(loss1d(w))}</dd>
        </div>
        <div>
          <dt>slope</dt>
          <dd>{flewOff ? '—' : signed(measuredSlope(w))}</dd>
        </div>
        <div>
          <dt>steps</dt>
          <dd>{count}</dd>
        </div>
      </dl>

      <p className={`${css.verdict} ${flewOff ? css.verdictWarn : ''}`} role="status" aria-live="polite">
        {message}
      </p>

      <p className={css.footnote}>
        That slope was found without any calculus: nudge the weight a hair each way, see how far the
        loss moves, divide.{' '}
        {flewOff ? '' : `Calculus gives ${signed(slope)}, and the two agree.`}
      </p>
    </div>
  );
}
