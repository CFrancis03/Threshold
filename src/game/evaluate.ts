import { predict } from '../nn/network';
import type { Dataset } from '../nn/datasets';
import type { Network } from '../nn/types';
import type { CheckRow, WinResult } from './types';
import { fixed } from '../lib/format';

export const THRESHOLD = 0.5;

/**
 * Pips are awarded on confidence, not speed: how far the answers sit from the
 * line where the decision flips. An output of 0.51 is technically correct and
 * completely unconvincing.
 */
export function pipsFor(confidence: number): 0 | 1 | 2 | 3 {
  if (confidence >= 0.4) return 3;
  if (confidence >= 0.25) return 2;
  if (confidence > 0) return 1;
  return 0;
}

/**
 * With only four rows, the weakest one is the honest score. With a hundred
 * points, one awkward point sitting near the boundary should not define the
 * whole attempt, so we take the weakest tenth instead.
 */
export function confidenceOf(margins: number[]): number {
  if (margins.length === 0) return 0;
  const sorted = [...margins].sort((a, b) => a - b);
  if (sorted.length <= 8) return sorted[0];
  const index = Math.floor(sorted.length * 0.1);
  return sorted[index];
}

export interface EvaluateOptions {
  requiredAccuracy?: number;
  threshold?: number;
  /** Names for the input columns, used in the feedback sentence. */
  inputNames?: string[];
}

export function evaluate(net: Network, dataset: Dataset, opts: EvaluateOptions = {}): WinResult {
  const { requiredAccuracy = 1, threshold = THRESHOLD } = opts;

  const rows: CheckRow[] = dataset.points.map((point) => {
    const output = predict(net, point.x)[0];
    const target = point.y[0];
    const ok = (output >= threshold ? 1 : 0) === (target >= threshold ? 1 : 0);
    return {
      input: point.x,
      output,
      target,
      ok,
      // Signed: negative when the answer is on the wrong side, so a wrong row
      // can never quietly earn confidence.
      margin: ok ? Math.abs(output - threshold) : -Math.abs(output - threshold),
    };
  });

  const correct = rows.filter((r) => r.ok).length;
  const total = rows.length;
  const accuracy = total === 0 ? 1 : correct / total;
  const solved = accuracy >= requiredAccuracy - 1e-9;
  const confidence = solved ? confidenceOf(rows.filter((r) => r.ok).map((r) => r.margin)) : 0;

  return {
    solved,
    rows,
    correct,
    total,
    confidence,
    pips: solved ? pipsFor(confidence) : 0,
    message: describe(rows, { solved, correct, total, confidence, kind: dataset.kind }),
  };
}

function describe(
  rows: CheckRow[],
  s: { solved: boolean; correct: number; total: number; confidence: number; kind: Dataset['kind'] },
): string {
  if (s.solved) {
    const strength =
      s.confidence >= 0.4
        ? 'and every answer is a long way clear of the line'
        : s.confidence >= 0.25
          ? 'with a comfortable margin'
          : 'though some answers are only just over the line';
    return s.kind === 'logic'
      ? `All four rows are right, ${strength}.`
      : `Every point is on the right side, ${strength}.`;
  }

  if (s.kind === 'logic') {
    const wrong = rows.find((r) => !r.ok)!;
    const wanted = wrong.target >= THRESHOLD ? 'above' : 'below';
    const count =
      s.correct === 0
        ? 'No rows are right yet'
        : `${s.correct} of ${s.total} rows ${s.correct === 1 ? 'is' : 'are'} right`;
    return `${count}. Row (${wrong.input.map((v) => fixed(v, 0)).join(', ')}) reads ${fixed(wrong.output)}, and it needs to be ${wanted} 0.50.`;
  }

  const missed = s.total - s.correct;
  return `${missed} ${missed === 1 ? 'point is' : 'points are'} still on the wrong side of the boundary.`;
}
