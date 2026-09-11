import css from './TruthTable.module.css';
import { fixed } from '../lib/format';
import type { CheckRow } from '../game/types';

export interface TruthTableProps {
  rows: CheckRow[];
  inputLabels?: string[];
  /** Highlight the row the network is currently being shown. */
  activeInput?: number[];
  /** Clicking a row runs that input through the network. */
  onPickRow?: (input: number[]) => void;
  caption?: string;
}

/**
 * The live win condition for the logic levels: every row, what the network
 * says, what it should say, and whether that is right — updating as the
 * player drags.
 */
export function TruthTable({ rows, inputLabels, activeInput, onPickRow, caption }: TruthTableProps) {
  const labels = inputLabels ?? rows[0]?.input.map((_, i) => `x${i + 1}`) ?? [];

  return (
    <table className={css.table}>
      {caption && <caption>{caption}</caption>}
      <thead>
        <tr>
          <th scope="col">{labels.join('  ')}</th>
          <th scope="col">reads</th>
          <th scope="col">wants</th>
          <th scope="col">
            <span className="sr-only">correct</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => {
          const active =
            activeInput && row.input.every((v, j) => Math.abs(v - activeInput[j]) < 1e-9);
          return (
            <tr
              key={i}
              className={`${row.ok ? css.good : css.bad} ${active ? css.current : ''}`}
              onClick={onPickRow ? () => onPickRow(row.input) : undefined}
              style={onPickRow ? { cursor: 'pointer' } : undefined}
            >
              <td className={css.inputs}>{row.input.map((v) => fixed(v, 0)).join('   ')}</td>
              <td className={`${css.out} ${row.output >= 0.5 ? css.on : css.off}`}>{fixed(row.output)}</td>
              <td>{fixed(row.target, 0)}</td>
              <td className={css.mark}>
                <span aria-label={row.ok ? 'correct' : 'wrong'}>{row.ok ? '✓' : '✗'}</span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
