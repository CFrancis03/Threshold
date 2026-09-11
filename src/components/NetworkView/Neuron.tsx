import { memo } from 'react';
import css from './NetworkView.module.css';
import { arcPath, type NodeGeom } from './layout';
import { useDragValue } from './useDragValue';
import { fixed, signed, spoken } from '../../lib/format';

export interface NeuronProps {
  geom: NodeGeom;
  /** The raw activation, shown in the readout. */
  activation: number;
  /** The same value mapped onto 0..1, used as the fill intensity. */
  normalized: number;
  bias: number | null;
  label: string;
  editable: boolean;
  active: boolean;
  selected: boolean;
  showReadout: boolean;
  onBiasChange: (next: number) => void;
  onSelect: () => void;
  onToggle?: () => void;
  onHover: (hovering: boolean) => void;
  onFocus: (focused: boolean) => void;
}

const BIAS_MIN = -8;
const BIAS_MAX = 8;
/** A bias of ±5 fills the ring. Beyond that the arc simply stays full. */
const RING_CAP = 5;
const RING_SWEEP = 330;

export const Neuron = memo(function Neuron({
  geom,
  activation,
  normalized,
  bias,
  label,
  editable,
  active,
  selected,
  showReadout,
  onBiasChange,
  onSelect,
  onToggle,
  onHover,
  onFocus,
}: NeuronProps) {
  const isInput = geom.kind === 'input';
  const { handlers, dragging } = useDragValue({
    value: bias ?? 0,
    onChange: onBiasChange,
    min: BIAS_MIN,
    max: BIAS_MAX,
    disabled: !editable || bias === null,
    onActivate: isInput ? (onToggle ?? onSelect) : onSelect,
  });

  const lit = active || selected || dragging;
  const ringRadius = geom.r + 5.5;
  const sweep = bias === null ? 0 : (Math.min(Math.abs(bias), RING_CAP) / RING_CAP) * RING_SWEEP * Math.sign(bias);

  // Once the fill passes halfway the text has to flip to the paper colour to
  // stay readable against it.
  const inverted = normalized > 0.55;

  const valueText = isInput ? fixed(activation, Number.isInteger(activation) ? 0 : 1) : fixed(activation);

  const ariaLabel = isInput
    ? `${label}, value ${spoken(activation, 2)}${onToggle ? '. Press to switch it.' : ''}`
    : label;
  const ariaValueText =
    bias === null ? spoken(activation) : `bias ${spoken(bias)}, activation ${spoken(activation)}`;

  return (
    <g>
      {lit && (
        <circle
          className={`${css.halo} ${selected ? css.haloSelected : ''}`}
          cx={geom.x}
          cy={geom.y}
          r={ringRadius + 3}
          strokeWidth={5}
        />
      )}

      <circle className={css.neuronRim} cx={geom.x} cy={geom.y} r={geom.r} />
      <circle
        className={css.neuronFill}
        cx={geom.x}
        cy={geom.y}
        r={geom.r - 0.75}
        fillOpacity={Math.max(0, Math.min(1, normalized))}
      />

      {bias !== null && (
        <>
          {/* A faint complete ring so an empty arc still reads as "bias: zero"
              rather than as a missing control. */}
          <circle className={css.biasTrack} cx={geom.x} cy={geom.y} r={ringRadius} />
          {sweep !== 0 && (
            <path
              className={css.bias}
              d={arcPath(geom.x, geom.y, ringRadius, sweep)}
              stroke={bias >= 0 ? 'var(--excite)' : 'var(--inhibit)'}
              strokeDasharray={bias < 0 ? '4 3' : undefined}
            />
          )}
        </>
      )}

      {showReadout && (
        <text className={`${css.readout} ${inverted ? css.readoutOn : ''}`} x={geom.x} y={geom.y}>
          {valueText}
        </text>
      )}

      <circle
        className={`${css.neuronHit} ${isInput ? css.inputHit : ''}`}
        cx={geom.x}
        cy={geom.y}
        r={Math.max(geom.r + 8, 22)}
        tabIndex={0}
        role={bias === null ? 'button' : 'slider'}
        aria-label={ariaLabel}
        aria-valuenow={bias === null ? undefined : Number(bias.toFixed(2))}
        aria-valuemin={bias === null ? undefined : BIAS_MIN}
        aria-valuemax={bias === null ? undefined : BIAS_MAX}
        aria-valuetext={bias === null ? undefined : ariaValueText}
        aria-disabled={bias !== null && !editable ? true : undefined}
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
        onFocus={() => onFocus(true)}
        onBlur={() => onFocus(false)}
        {...handlers}
      />

      {bias !== null && lit && (
        <text className={css.edgeLabel} x={geom.x} y={geom.y - ringRadius - 9} fill="currentColor">
          b {signed(bias)}
        </text>
      )}
    </g>
  );
});
