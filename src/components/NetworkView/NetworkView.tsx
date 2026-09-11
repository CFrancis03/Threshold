import { useMemo, useState, type ReactNode } from 'react';
import css from './NetworkView.module.css';
import { Edge } from './Edge';
import { Neuron } from './Neuron';
import { layoutNetwork, type LayoutOptions } from './layout';
import { describeParam, nameFor, nodeName, sameParam } from './labels';
import { forward, setBias, setWeight } from '../../nn/network';
import { normalizeActivation } from '../../nn/activations';
import type { Network, ParamRef } from '../../nn/types';
import { usePrefersReducedMotion } from '../../lib/motion';
import { useMeasuredWidth } from '../../lib/useMeasure';

export interface NetworkViewProps {
  net: Network;
  /** The input vector currently flowing through the network. */
  inputs: number[];
  onChange?: (next: Network) => void;
  selected?: ParamRef | null;
  onSelect?: (ref: ParamRef | null) => void;
  editable?: boolean;
  inputLabels?: string[];
  outputLabels?: string[];
  /** Called when an input neuron is pressed — levels use it to flip 0 and 1. */
  onInputToggle?: (index: number) => void;
  /** Change this value to replay the left-to-right signal pulse. */
  pulseKey?: number | string;
  /** Force every weight label on. Small networks do this automatically. */
  showAllValues?: boolean;
  /** Numbers inside the neurons. On by default. */
  showReadouts?: boolean;
  layoutOptions?: LayoutOptions;
  caption?: ReactNode;
  className?: string;
  /** Announced to screen readers as the figure's description. */
  title?: string;
}

/**
 * The network diagram: the one loud object on any page it appears on.
 *
 * Everything it draws is derived from `net` and `inputs`, so a change anywhere
 * shows up everywhere at once — no cached copies, nothing to keep in sync.
 */
export function NetworkView({
  net,
  inputs,
  onChange,
  selected = null,
  onSelect,
  editable = true,
  inputLabels,
  outputLabels,
  onInputToggle,
  pulseKey,
  showAllValues,
  showReadouts = true,
  layoutOptions,
  caption,
  className,
  title,
}: NetworkViewProps) {
  const [hovered, setHovered] = useState<ParamRef | null>(null);
  const [focused, setFocused] = useState<ParamRef | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const [wrapRef, measured] = useMeasuredWidth<HTMLElement>(720);

  // Draw at one SVG unit per CSS pixel so neurons, labels and touch targets
  // keep their real size on a phone instead of being scaled down with the box.
  const drawWidth = Math.max(288, Math.min(measured, layoutOptions?.width ?? 860));
  const tight = drawWidth < 560;

  const columns = net.layers.length + 1;
  const shortLabels = tight && !inputLabels && !outputLabels;

  // The widest side label decides the horizontal padding. Guessing at a fixed
  // number here is how "output" ends up hanging off the edge of the drawing.
  const sideRoom = useMemo(() => {
    if (shortLabels) return 24;
    const outputs = net.layers[net.layers.length - 1].biases.length;
    const texts = [
      ...Array.from({ length: net.inputSize }, (_, i) => inputLabels?.[i] ?? `input ${i + 1}`),
      ...Array.from({ length: outputs }, (_, i) => outputLabels?.[i] ?? (outputs === 1 ? 'output' : `output ${i + 1}`)),
    ];
    const longest = texts.reduce((n, t) => Math.max(n, t.length), 0);
    return Math.ceil(longest * 6.1) + 16;
  }, [net, inputLabels, outputLabels, shortLabels]);

  const resolvedLayout = useMemo<LayoutOptions>(
    () => ({
      gap: tight ? 20 : 26,
      maxRadius: tight ? 19 : 21,
      ...layoutOptions,
      width: drawWidth,
      padX: layoutOptions?.padX ?? Math.min(drawWidth * 0.26, Math.max(tight ? 30 : 46, sideRoom)),
    }),
    [drawWidth, tight, layoutOptions, sideRoom],
  );

  const geom = useMemo(() => layoutNetwork(net, resolvedLayout), [net, resolvedLayout]);
  const trace = useMemo(() => forward(net, inputs), [net, inputs]);
  const names = useMemo(() => ({ inputLabels, outputLabels }), [inputLabels, outputLabels]);

  const labelledValues = showAllValues ?? (geom.edges.length <= 6 && !tight);
  const canEdit = editable && !!onChange;

  const isLit = (ref: ParamRef) => sameParam(hovered, ref) || sameParam(focused, ref);

  const setRef = (setter: (r: ParamRef | null) => void, ref: ParamRef, on: boolean) =>
    setter(on ? ref : null);

  return (
    <figure ref={wrapRef} className={`${css.wrap} ${className ?? ''}`} style={{ margin: 0 }}>
      <svg
        className={css.svg}
        viewBox={`0 0 ${geom.width} ${geom.height}`}
        role="group"
        aria-label={title ?? 'Network diagram. Each connection and neuron can be focused and adjusted with the arrow keys.'}
      >
        {/* Edges first so the neurons sit on top of them. */}
        <g>
          {geom.edges.map((e) => {
            const ref: ParamRef = { kind: 'weight', layer: e.layer, to: e.to, from: e.from };
            return (
              <Edge
                key={e.key}
                geom={e}
                weight={net.layers[e.layer].weights[e.to][e.from]}
                label={describeParam(net, ref, names)}
                editable={canEdit}
                active={isLit(ref)}
                selected={sameParam(selected, ref)}
                showValue={labelledValues}
                onChange={(v) => onChange?.(setWeight(net, e.layer, e.to, e.from, v))}
                onSelect={() => onSelect?.(sameParam(selected, ref) ? null : ref)}
                onHover={(on) => setRef(setHovered, ref, on)}
                onFocus={(on) => setRef(setFocused, ref, on)}
              />
            );
          })}
        </g>

        {/* The travelling signal. Remounting the group on pulseKey restarts the
            CSS animation, which is the simplest reliable way to replay it. */}
        {!reducedMotion && pulseKey !== undefined && (
          <g key={`pulse-${pulseKey}`} aria-hidden="true">
            {geom.edges.map((e) => (
              <path
                key={e.key}
                className={css.pulse}
                d={`M ${e.x1} ${e.y1} L ${e.x2} ${e.y2}`}
                pathLength={100}
                style={{ ['--pulse-delay' as string]: `${e.layer * 95}ms` }}
              />
            ))}
          </g>
        )}

        <g>
          {geom.nodes.map((n) => {
            const isInput = n.column === 0;
            const activation = trace.activations[n.column][n.index];
            const activationName = isInput ? null : net.layers[n.layer].activation;
            const normalized = isInput
              ? Math.max(0, Math.min(1, activation))
              : normalizeActivation(activation, activationName!);
            const bias = isInput ? null : net.layers[n.layer].biases[n.index];
            const ref: ParamRef = { kind: 'bias', layer: n.layer, to: n.index };

            return (
              <Neuron
                key={n.key}
                geom={n}
                activation={activation}
                normalized={normalized}
                bias={bias}
                label={isInput ? nodeName(n, columns, names) : describeParam(net, ref, names)}
                editable={canEdit}
                active={!isInput && isLit(ref)}
                selected={!isInput && sameParam(selected, ref)}
                showReadout={showReadouts}
                onBiasChange={(v) => onChange?.(setBias(net, n.layer, n.index, v))}
                onSelect={() => !isInput && onSelect?.(sameParam(selected, ref) ? null : ref)}
                onToggle={isInput && onInputToggle ? () => onInputToggle(n.index) : undefined}
                onHover={(on) => !isInput && setRef(setHovered, ref, on)}
                onFocus={(on) => !isInput && setRef(setFocused, ref, on)}
              />
            );
          })}
        </g>

        {/* Names sit outside the diagram so they never crowd the neurons. */}
        <g aria-hidden="true">
          {geom.nodes
            .filter((n) => n.column === 0 || n.column === columns - 1)
            .map((n) => {
              const left = n.column === 0;
              return (
                <text
                  key={`l-${n.key}`}
                  className={`${css.sideLabel} ${left ? css.sideLabelLeft : css.sideLabelRight}`}
                  x={left ? n.x - n.r - 10 : n.x + n.r + 10}
                  y={n.y}
                >
                  {shortLabels ? (left ? `x${n.index + 1}` : 'y') : nameFor(net, n.column, n.index, names)}
                </text>
              );
            })}
        </g>
      </svg>
      {caption && <figcaption className="caption">{caption}</figcaption>}
    </figure>
  );
}
