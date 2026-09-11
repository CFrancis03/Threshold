import css from './LevelMap.module.css';
import { Link, navigate } from '../router';
import { levels } from '../game/registry';
import { LEVEL_COUNT, useProgress } from '../state/useProgress';
import { Button, Pips } from '../components/ui/Controls';

/** What each level is about, for people choosing where to go back to. */
const BLURBS: Record<number, string> = {
  1: 'Weights, bias, and the line a neuron has to cross to fire.',
  2: 'The same neuron doing two other jobs, including one that needs negative weights.',
  3: 'The truth table, redrawn as a picture: one neuron draws one straight line.',
  4: 'A puzzle a single neuron cannot solve, and the hidden layer that can.',
  5: 'Several neurons, each drawing a line, combined into a shape.',
  6: 'Swapping the squash and watching the boundary change with it.',
  7: 'Hand the job to gradient descent and watch it find the weights itself.',
};

const TITLES: Record<number, string> = {
  5: 'Hidden layers as feature detectors',
  6: 'Activation functions',
  7: 'Let the machine learn',
};

export function LevelMap() {
  const { progress, isUnlocked, furthestUnlocked, resetAll } = useProgress();
  const anyProgress = Object.keys(progress.completed).length > 0;

  return (
    <div className={css.page}>
      <div className={css.intro}>
        <h1 className="h-page">Seven puzzles</h1>
        <div className="prose" style={{ marginTop: 'var(--s-3)' }}>
          <p>
            They run in order, because each one needs the idea before it. About twenty minutes end to
            end, and the sandbox opens when you finish.
          </p>
        </div>
      </div>

      <div className={css.list}>
        {Array.from({ length: LEVEL_COUNT }, (_, i) => i + 1).map((id) => {
          const def = levels.find((l) => l.id === id);
          const unlocked = isUnlocked(id) && Boolean(def);
          const pips = progress.completed[id] ?? 0;
          const title = def?.subtitle ?? TITLES[id] ?? '';

          const body = (
            <>
              <span className={css.n}>{String(id).padStart(2, '0')}</span>
              <span>
                <span className={css.name}>{title}</span>
                <span className={css.blurb} style={{ display: 'block' }}>
                  {BLURBS[id]}
                </span>
              </span>
              <span className={css.trailing}>
                {pips > 0 ? (
                  <Pips count={pips} label={`${pips} of 3 for confidence`} />
                ) : unlocked ? (
                  <span>{id === furthestUnlocked ? 'next' : 'open'}</span>
                ) : (
                  <span>locked</span>
                )}
              </span>
            </>
          );

          return unlocked ? (
            <Link key={id} to={`/play/${id}`} className={`${css.item} ${pips ? css.done : ''}`}>
              {body}
            </Link>
          ) : (
            <div key={id} className={`${css.item} ${css.locked}`} aria-disabled="true">
              {body}
            </div>
          );
        })}
      </div>

      <div className={css.footer}>
        <Button variant="primary" onClick={() => navigate(`/play/${furthestUnlocked}`)}>
          {anyProgress ? `Carry on with level ${furthestUnlocked}` : 'Start level 1'}
        </Button>
        {anyProgress && (
          <Button variant="quiet" onClick={resetAll}>
            Clear my progress
          </Button>
        )}
      </div>
    </div>
  );
}
