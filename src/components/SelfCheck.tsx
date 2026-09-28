import css from './SelfCheck.module.css';
import { selfCheck } from '../content/selfCheck';

/**
 * The five things the site sets out to teach, asked before they are answered.
 *
 * Producing an explanation, even a clumsy one, does more for memory than
 * reading a good one. So each question comes first, and the answer sits behind
 * a disclosure for after the attempt.
 */
export function SelfCheck() {
  return (
    <div className={css.wrap}>
      <p className={css.lead}>
        Say each one out loud, or jot it down, before you open ours. If yours is worded differently
        but says the same thing, you have it.
      </p>
      <ol className={css.list}>
        {selfCheck.map((q) => (
          <li key={q.id} className={css.item}>
            <p className={css.prompt}>{q.prompt}</p>
            <details className={css.reveal}>
              <summary>Show our answer</summary>
              <p className={css.answer}>{q.answer}</p>
            </details>
          </li>
        ))}
      </ol>
    </div>
  );
}
