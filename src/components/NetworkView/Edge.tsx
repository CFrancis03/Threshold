import { memo } from 'react';
import css from './NetworkView.module.css';
import { strokeWidthForWeight, type EdgeGeom } from './layout';
import { useDragValue } from './useDragValue';
import { signed, spoken } from '../../lib/format';

export interface EdgeProps {
  geom: EdgeGeom;
  weight: number;
  label: string;
  editable: boolean;
  /** Clicking opens the inspector, even when the value cannot be changed. */
  selectable: boolean;
  active: boolean;
  /** Keyboard focus, which needs a higher-contrast ring than hover does. */
  focused: boolean;
  selected: boolean;
  showValue: boolean;
  /** Width of the invisible stroke that catches pointers. */
  hitWidth: number;
  onChange: (next: number) => void;
  onSelect: () => void;
  onHover: (hovering: boolean) => void;
  onFocus: (focused: boolean) => void;
}

const WEIGHT_MIN = -8;
const WEIGHT_MAX = 8;

/**
 * One connection. Thickness carries magnitude, colour carries sign, and a
 * dashed line carries the sign a second time for anyone who cannot see the
 * colour. Drag it up and down to change the weight.
 */
export const Edge = memo(function Edge({
  geom,
  weight,
  label,
  editable,
  selectable,
  active,
  focused,
  selected,
  showValue,
  hitWidth,
  onChange,
  onSelect,
  onHover,
  onFocus,
}: EdgeProps) {
  const { handlers, dragging } = useDragValue({
    value: weight,
    onChange,
    min: WEIGHT_MIN,
    max: WEIGHT_MAX,
    disabled: !editable,
    onActivate: onSelect,
  });

  const d = `M ${geom.x1} ${geom.y1} L ${geom.x2} ${geom.y2}`;
  const width = strokeWidthForWeight(weight);
  const negative = weight < 0;
  const lit = active || selected || dragging;
  const interactive = editable || selectable;

  return (
    <g>
      {focused && (
        <>
          <path className={css.haloFocus} d={d} strokeWidth={width + 13} />
          <path className={css.haloFocusFill} d={d} strokeWidth={width + 9} />
        </>
      )}
      {lit && !focused && (
        <path
          className={`${css.halo} ${selected ? css.haloSelected : ''}`}
          d={d}
          strokeWidth={width + 9}
        />
      )}
      <path
        className={`${css.edge} ${negative ? css.neg : css.pos} ${Math.abs(weight) < 0.03 ? css.dead : ''}`}
        d={d}
        strokeWidth={width}
      />
      {interactive && (
      <path
        className={css.hit}
        d={d}
        strokeWidth={hitWidth}
        tabIndex={0}
        role="slider"
        aria-label={label}
        aria-valuenow={Number(weight.toFixed(2))}
        aria-valuemin={WEIGHT_MIN}
        aria-valuemax={WEIGHT_MAX}
        aria-valuetext={spoken(weight)}
        aria-disabled={!editable || undefined}
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
        onFocus={() => onFocus(true)}
        onBlur={() => onFocus(false)}
        {...handlers}
      />
      )}
      {(showValue || lit) && (
        <text className={css.edgeLabel} x={geom.lx} y={geom.ly - 9} fill="currentColor">
          {signed(weight)}
        </text>
      )}
    </g>
  );
});
