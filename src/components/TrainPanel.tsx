import { useState } from 'react';
import css from './TrainPanel.module.css';
import { Button, Slider } from './ui/Controls';
import { LossCurve } from './LossCurve';
import { useTrainer } from '../state/useTrainer';
import type { Network, Sample } from '../nn/types';
import { fixed } from '../lib/format';

export interface TrainPanelProps {
  net: Network;
  onNet: (net: Network) => void;
  data: Sample[];
  defaultLearningRate?: number;
  /** Put the network back to its untrained starting point. */
  onStartOver: () => void;
}

/** Slider positions are log10 of the rate; the readout shows the real number. */
const MIN_EXP = -2;
const MAX_EXP = 0.7;

export function TrainPanel({ net, onNet, data, defaultLearningRate = 0.4, onStartOver }: TrainPanelProps) {
  const [exp, setExp] = useState(Math.log10(defaultLearningRate));
  const learningRate = Math.round(10 ** exp * 1000) / 1000;

  const trainer = useTrainer(net, { data, learningRate, loss: 'bce', momentum: 0.9, onNet });
  const state = trainer.state;

  const diverging = Boolean(state && state.history.length > 12 && state.loss > state.history[0] * 1.15);
  const crawling = Boolean(
    state && !diverging && state.history.length > 120 && state.loss > state.history[0] * 0.9,
  );

  return (
    <div className={css.panel}>
      <div className={css.split}>
        <div style={{ display: 'grid', gap: 'var(--s-3)' }}>
          <div className={css.row}>
            <Button
              variant="primary"
              onClick={() => trainer.toggle(net)}
              disabled={!trainer.trainable}
              aria-live="polite"
            >
              {trainer.running ? 'Pause' : state ? 'Keep training' : 'Train network'}
            </Button>
            <Button
              onClick={() => {
                trainer.reset();
                onStartOver();
              }}
            >
              Start over
            </Button>
          </div>

          <Slider
            label="Learning rate"
            value={exp}
            onChange={setExp}
            min={MIN_EXP}
            max={MAX_EXP}
            step={0.01}
            hideNumber
            note={<span className={css.rate}>{fixed(learningRate, learningRate < 0.1 ? 3 : 2)}</span>}
          />

          <p className={`${css.verdict} ${diverging ? css.warn : ''}`} role="status">
            {!trainer.trainable
              ? 'This network cannot be trained: its squash has no slope.'
              : diverging
                ? 'The loss is going up. The steps are too big — try a smaller rate.'
                : crawling
                  ? 'Barely moving. The steps are too small to get anywhere — try a larger rate.'
                  : trainer.running
                    ? `Running ${trainer.stepsPerFrame} steps a frame.`
                    : 'Each step nudges every weight a little way downhill.'}
          </p>
        </div>

        <LossCurve
          history={state?.history ?? []}
          step={state?.step ?? 0}
          accuracy={state ? state.accuracy : null}
        />
      </div>
    </div>
  );
}
