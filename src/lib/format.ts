/** Number formatting. Every number on screen goes through one of these. */

/** Always shows a sign, so a weight reads as a signed quantity, not a size. */
export function signed(value: number, decimals = 2): string {
  const rounded = Number(value.toFixed(decimals));
  // Avoid "-0.00".
  const safe = Object.is(rounded, -0) ? 0 : rounded;
  return `${safe >= 0 ? '+' : '−'}${Math.abs(safe).toFixed(decimals)}`;
}

/** Unsigned, for activations and probabilities which are never negative. */
export function fixed(value: number, decimals = 2): string {
  const r = Number(value.toFixed(decimals));
  return (Object.is(r, -0) ? 0 : r).toFixed(decimals);
}

/** For the loss readout, which spans several orders of magnitude. */
export function compact(value: number): string {
  if (value === 0) return '0';
  if (Math.abs(value) < 0.001) return value.toExponential(1).replace('e-', '×10⁻');
  return value.toFixed(Math.abs(value) < 0.1 ? 4 : 3);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Round to the nearest step, used when dragging and nudging parameters. */
export function quantize(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/** Spoken form of a number, for aria-labels: "minus one point two". */
export function spoken(value: number, decimals = 2): string {
  const v = Number(value.toFixed(decimals));
  return v < 0 ? `minus ${Math.abs(v).toFixed(decimals)}` : v.toFixed(decimals);
}
