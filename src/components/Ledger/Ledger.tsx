import { useMemo, type ReactNode } from 'react';
import css from './Ledger.module.css';
import { ActivationCurve } from './ActivationCurve';
import { forward } from '../../nn/network';
import { getActivation } from '../../nn/activations';
import { nameFor, type NameOptions } from '../NetworkView/labels';
import { fixed, signed } from '../../lib/format';
import type { Network } from '../../nn/types';

export interface LedgerProps {
  net: Network;
  inputs: number[];
  /** Which neuron to open up: layer index into net.layers, and its position. */
  layer: number;
  neuron: number;
  names?: NameOptions;
  /** The value the game compares the output against. */
  threshold?: number;
  /** Dim every row but this one: an input index, or the bias. */
  highlight?: number | 'bias' | null;
  /** Drop the frame when the ledger already sits inside a panel. */
  flat?: boolean;
  className?: string;
}

interface Term {
  key: string;
  name: string;
  weight: number;
  input: number;
  contribution: number;
}

/**
 * The single most educational thing on the site.
 *
 * It shows one neuron's arithmetic three ways at once: as numbers, as a
 * balance of signed bars pushing either side of zero, and as a dot sitting on
 * the activation curve. Change any weight and all three move together.
 */
export function Ledger({
  net,
  inputs,
  layer,
  neuron,
  names,
  threshold = 0.5,
  highlight = null,
  flat = false,
  className,
}: LedgerProps) {
  const trace = useMemo(() => forward(net, inputs), [net, inputs]);

  const shell = `${flat ? css.flat : css.ledger} ${className ?? ''}`;
  const valid = layer >= 0 && layer < net.layers.length && neuron < net.layers[layer].biases.length;
  if (!valid) {
    return (
      <div className={shell}>
        <p className={css.empty}>Select a neuron to see its arithmetic.</p>
      </div>
    );
  }

  const layerDef = net.layers[layer];
  const weights = layerDef.weights[neuron];
  const bias = layerDef.biases[neuron];
  const incoming = trace.activations[layer];
  const z = trace.preActivations[layer][neuron];
  const a = trace.activations[layer + 1][neuron];
  const act = getActivation(layerDef.activation);

  const terms: Term[] = weights.map((w, i) => ({
    key: `t-${i}`,
    name: nameFor(net, layer, i, names),
    weight: w,
    input: incoming[i],
    contribution: w * incoming[i],
  }));

  // Every bar is drawn on the same scale, so their lengths can be compared
  // against each other and against the sum.
  const scale = Math.max(0.6, ...terms.map((t) => Math.abs(t.contribution)), Math.abs(bias), Math.abs(z));

  const barFor = (value: number) => {
    const pct = (Math.abs(value) / scale) * 50;
    if (pct < 0.4) return null;
    return (
      <span
        className={`${css.bar} ${value >= 0 ? css.barPos : css.barNeg}`}
        style={{ width: `${pct.toFixed(2)}%` }}
      />
    );
  };

  const toneOf = (v: number) => (Math.abs(v) < 0.005 ? css.zero : v > 0 ? css.pos : css.neg);

  const title = nameFor(net, layer + 1, neuron, names);
  const spokenSum = terms
    .map((t) => `${signed(t.weight)} times ${fixed(t.input)}`)
    .concat(`bias ${signed(bias)}`)
    .join(', ');

  return (
    <div className={shell}>
      <div className={css.head}>
        <span className={css.title}>{title}</span>
        <span className={css.squashName}>{layerDef.activation}</span>
      </div>

      {/* One spoken sentence for screen readers; the grid below is decorative
          detail on top of it. */}
      <p className="sr-only" aria-live="polite">
        {`${title}: ${spokenSum}. Sum ${signed(z)}, through ${layerDef.activation}, gives ${fixed(a)}.`}
      </p>

      <div className={css.rows} aria-hidden="true">
        {terms.map((t, i) => (
          <Row
            key={t.key}
            name={t.name}
            expr={`${signed(t.weight)} × ${fixed(t.input)}`}
            value={t.contribution}
            tone={toneOf(t.contribution)}
            bar={barFor(t.contribution)}
            dim={highlight !== null && highlight !== i}
          />
        ))}

        <Row
          name="bias"
          expr="always on"
          value={bias}
          tone={toneOf(bias)}
          bar={barFor(bias)}
          dim={highlight !== null && highlight !== 'bias'}
        />

        <div className={css.divider} />

        <div className={`${css.rows} ${css.sumRow}`} style={{ display: 'contents' }}>
          <span className={css.name}>sum</span>
          <span className={css.expr}>z</span>
          <span className={css.track}>{barFor(z)}</span>
          <span className={`${css.value} ${toneOf(z)}`}>{signed(z)}</span>
          <span className={css.thresholdMark}>
            <span>0</span>
          </span>
        </div>
      </div>

      <div className={css.result}>
        <ActivationCurve activation={layerDef.activation} z={z} a={a} threshold={threshold} />
        <div className={css.outcome}>
          <span className={css.outcomeLabel}>through {layerDef.activation}</span>
          <span className={css.outcomeValue}>{fixed(a)}</span>
          <span className={css.verdict}>
            {act.range[1] === 1 && act.range[0] === 0
              ? a >= threshold
                ? `above ${fixed(threshold, 1)} — this neuron is on`
                : `below ${fixed(threshold, 1)} — this neuron is off`
              : `range ${fixed(act.range[0], 0)} to ${fixed(act.range[1], 0)}`}
          </span>
        </div>
      </div>
    </div>
  );
}

function Row({
  name,
  expr,
  value,
  tone,
  bar,
  dim,
}: {
  name: string;
  expr: string;
  value: number;
  tone: string;
  bar: ReactNode;
  dim: boolean;
}) {
  // Dimming the other rows is a clearer "this is the term you are holding"
  // than highlighting one would be, and it needs no background band to fight
  // with the grid gaps.
  const d = dim ? css.dim : '';
  return (
    <>
      <span className={`${css.name} ${d}`}>{name}</span>
      <span className={`${css.expr} ${d}`}>{expr}</span>
      <span className={`${css.track} ${d}`}>{bar}</span>
      <span className={`${css.value} ${tone} ${d}`}>{signed(value)}</span>
    </>
  );
}
