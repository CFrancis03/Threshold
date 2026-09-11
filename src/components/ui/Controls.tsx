import {
  useId,
  useState,
  type ButtonHTMLAttributes,
  type ChangeEvent,
  type ReactNode,
} from 'react';
import css from './Controls.module.css';
import { fixed } from '../../lib/format';

/* -------------------------------------------------------------- Button */

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'quiet';
  size?: 'default' | 'small';
}

export function Button({ variant = 'default', size = 'default', className, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={[
        css.button,
        variant === 'primary' ? css.primary : '',
        variant === 'quiet' ? css.quiet : '',
        size === 'small' ? css.small : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    />
  );
}

/* -------------------------------------------------------------- Slider */

export interface SliderProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Shown to the right of the label, e.g. a unit or a hint. */
  note?: ReactNode;
  disabled?: boolean;
  decimals?: number;
  /** Hide the number box when the slider alone is enough. */
  hideNumber?: boolean;
}

/**
 * A slider paired with a number box. The pair matters: the slider is for
 * exploring, the box is for saying exactly what you mean.
 */
export function Slider({
  label,
  value,
  onChange,
  min = -8,
  max = 8,
  step = 0.01,
  note,
  disabled,
  decimals = 2,
  hideNumber,
}: SliderProps) {
  const id = useId();
  // Kept as text while focused so a half-typed "-" or "0." is not destroyed.
  const [draft, setDraft] = useState<string | null>(null);

  const commit = (raw: string) => {
    const parsed = Number(raw.replace('−', '-'));
    if (Number.isFinite(parsed)) onChange(Math.min(max, Math.max(min, parsed)));
    setDraft(null);
  };

  return (
    <div className={css.field}>
      <div className={css.fieldHead}>
        <label className={css.fieldLabel} htmlFor={id}>
          {label}
        </label>
        {note && <span className={css.fieldLabel}>{note}</span>}
      </div>
      <div className={css.sliderRow}>
        <input
          id={id}
          className={css.range}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(Number(e.target.value))}
        />
        {!hideNumber && (
          <input
            className={`${css.number} num`}
            type="text"
            inputMode="decimal"
            aria-label={`${label}, exact value`}
            value={draft ?? fixed(value, decimals)}
            disabled={disabled}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit((e.target as HTMLInputElement).value);
              if (e.key === 'Escape') setDraft(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------- SegmentedControl */

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
  title?: string;
}

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className={css.segmented} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          disabled={o.disabled}
          title={o.title}
          className={`${css.segment} ${o.value === value ? css.segmentOn : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- Pips */

/**
 * Confidence, shown as filled charge pips rather than gold stars. Three pips
 * means every answer is a long way clear of the threshold.
 */
export function Pips({ count, total = 3, label }: { count: number; total?: number; label?: string }) {
  return (
    <span className={css.pips} role="img" aria-label={label ?? `${count} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`${css.pip} ${i < count ? css.pipOn : ''}`} />
      ))}
    </span>
  );
}

/* --------------------------------------------------------------- Plate */

/**
 * Frames the live instrument. Used once per page, around the network.
 */
export function Plate({
  title,
  aside,
  children,
  className,
}: {
  title?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`${css.plate} ${className ?? ''}`}>
      {(title || aside) && (
        <header className={css.plateHead}>
          <span className={css.plateTitle}>{title}</span>
          {aside}
        </header>
      )}
      {children}
    </section>
  );
}
