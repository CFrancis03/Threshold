import css from './Glossary.module.css';
import { glossary } from '../content/glossary';

/** Every word the site uses, in plain language. */
export function Glossary() {
  return (
    <dl className={css.list}>
      {glossary.map((t) => (
        <div key={t.id} id={`how-word-${t.id}`} className={css.entry}>
          <dt className={css.term}>{t.term}</dt>
          <dd className={css.def}>
            {t.plain}
            <span className={css.where}>{t.where}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
