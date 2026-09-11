import { useCallback, useEffect, useMemo, useState } from 'react';
import css from './Level.module.css';
import { NetworkView } from '../components/NetworkView/NetworkView';
import { Inspector } from '../components/Inspector/Inspector';
import { Ledger } from '../components/Ledger/Ledger';
import { BoundaryCanvas, MiniBoundary, miniRowClass } from '../components/Boundary/BoundaryCanvas';
import { TrainPanel } from '../components/TrainPanel';
import { TruthTable } from '../components/TruthTable';
import { Button, Pips, Plate, SegmentedControl } from '../components/ui/Controls';
import { useNetworkState } from '../state/useNetworkState';
import { useProgress, LEVEL_COUNT } from '../state/useProgress';
import { getLevel } from '../game/registry';
import { setHiddenActivation } from '../nn/network';
import type { ActivationName } from '../nn/types';
import { evaluate } from '../game/evaluate';
import { navigate, Link } from '../router';


const HINT_DELAY_MS = 60_000;

export function Level({ id }: { id: number }) {
  const level = getLevel(id);
  if (!level) return <NotBuiltYet id={id} />;
  return <LevelScreen key={id} id={id} />;
}

function LevelScreen({ id }: { id: number }) {
  const level = getLevel(id)!;
  const { complete, isUnlocked } = useProgress();

  const [stageIndex, setStageIndex] = useState(0);
  const stage = level.stages[stageIndex];

  const state = useNetworkState(level.makeNetwork(), startingInput(level));
  const { net, setNet, inputs, selected, setSelected } = state;

  const [attempts, setAttempts] = useState(0);
  const [checked, setChecked] = useState(false);
  const [hintShown, setHintShown] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [escaped, setEscaped] = useState(false);
  const [finished, setFinished] = useState(false);
  const [awarded, setAwarded] = useState(0);
  /** The level 4 beat: the best score reached so far, which will not reach 4. */
  const [best, setBest] = useState(0);

  const result = useMemo(
    () => evaluate(net, stage.dataset, { requiredAccuracy: stage.requiredAccuracy }),
    [net, stage],
  );

  useEffect(() => {
    setBest((b) => Math.max(b, result.correct));
  }, [result.correct]);

  // The hint is always available on request; after a minute the level says so.
  useEffect(() => {
    setNudge(false);
    const t = window.setTimeout(() => setNudge(true), HINT_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [stageIndex]);

  const blocked = level.blocker?.(net) ?? null;

  const check = useCallback(() => {
    setChecked(true);
    if (result.solved && !blocked) {
      setFinished(true);
      setAwarded(result.pips);
      if (stageIndex === level.stages.length - 1) complete(level.id, result.pips);
    } else {
      setAttempts((a) => a + 1);
    }
  }, [result, blocked, stageIndex, level, complete]);

  const nextStage = () => {
    const next = stageIndex + 1;
    setStageIndex(next);
    setFinished(false);
    setChecked(false);
    setHintShown(false);
    setAttempts(0);
    setBest(0);
    if (level.stages[next]?.resetNetwork) state.replace(level.makeNetwork(), true);
  };

  const applyEscape = () => {
    if (!level.escape) return;
    state.replace(level.escape.apply(net), true);
    setEscaped(true);
    setChecked(false);
  };

  const showEscape = Boolean(level.escape) && !escaped && (attempts >= level.escape!.afterAttempts || hintShown);
  const lastStage = stageIndex === level.stages.length - 1;
  const isLogic = stage.dataset.kind === 'logic';
  const editable = level.allow.weights || level.allow.biases;

  const outputLayer = net.layers.length - 1;

  return (
    <div className={css.page}>
      <div className={css.instrument}>
        <Plate
          title="Live network"
          aside={
            // The activation picker belongs on the instrument, not buried in
            // the inspector, on the level that is entirely about it.
            level.allow.activation && level.activationChoices ? (
              <SegmentedControl<ActivationName>
                label="Squash used by the hidden layer"
                value={net.layers[0].activation}
                options={level.activationChoices.map((n) => ({ value: n, label: n }))}
                onChange={(n) => setNet(setHiddenActivation(net, n))}
              />
            ) : isLogic ? (
              <span className={css.inputPicker}>
                <span className="caption">showing</span>
                <span className="num caption">
                  ({inputs.map((v) => (v > 0.5 ? 1 : 0)).join(', ')})
                </span>
              </span>
            ) : undefined
          }
        >
          <div className={css.stack}>
            <div className={css.stackMain}>
              <NetworkView
                net={net}
                inputs={inputs}
                onChange={editable ? setNet : undefined}
                editable={editable}
                selected={selected}
                onSelect={setSelected}
                onInputToggle={isLogic ? state.toggleInput : undefined}
                pulseKey={state.pulse}
                inputLabels={level.inputLabels}
                outputLabels={level.outputLabels}
                caption={
                  isLogic
                    ? 'Press an input to switch it between 0 and 1. Drag any connection or neuron to change it.'
                    : 'Drag any connection or neuron to move the line. Tab to focus one, then use the arrow keys.'
                }
              />
            </div>

            {level.view !== 'truthTable' && (
              <div className={css.stackSide}>
                <BoundaryCanvas
                  net={net}
                  dataset={stage.dataset}
                  caption={`${stage.dataset.label} · the dark line is the boundary`}
                />
              </div>
            )}
          </div>

          {/* Each hidden neuron's own view of the square, so "this one draws
              this line" is something you can see rather than infer. */}
          {level.view === 'boundaryWithHidden' && (
            <div className={css.miniHeads}>
              <p className="caption" style={{ flexBasis: '100%', margin: 0 }}>
                What each hidden neuron sees on its own
              </p>
              <div className={miniRowClass}>
                {net.layers[0].biases.map((_, j) => (
                  <MiniBoundary
                    key={j}
                    net={net}
                    dataset={stage.dataset}
                    layer={0}
                    neuron={j}
                    label={`hidden ${j + 1}`}
                  />
                ))}
              </div>
            </div>
          )}
        </Plate>

        {level.allow.train && (
          <TrainPanel
            net={net}
            onNet={setNet}
            data={stage.dataset.points}
            defaultLearningRate={level.learningRate}
            onStartOver={state.reset}
          />
        )}

        {/* The ledger is always open, because it is the thing that explains
            what a drag just did. Selecting something swaps it for the
            inspector, which is the same ledger plus a precise control — and
            which rises as a sheet on a narrow screen. */}
        {selected ? (
          <Inspector
            net={net}
            inputs={inputs}
            selected={selected}
            onChange={setNet}
            onClose={() => setSelected(null)}
            editable={editable}
            allowActivationChange={level.allow.activation}
            names={{ inputLabels: level.inputLabels, outputLabels: level.outputLabels }}
          />
        ) : (
          <Ledger
            net={net}
            inputs={inputs}
            layer={outputLayer}
            neuron={0}
            names={{ inputLabels: level.inputLabels, outputLabels: level.outputLabels }}
          />
        )}
      </div>

      <div className={css.column}>
        <div>
          <p className={css.eyebrow}>
            Level {level.id} of {LEVEL_COUNT} · {level.subtitle}
            {level.stages.length > 1 && (
              <span className={css.stageDots} aria-label={`Part ${stageIndex + 1} of ${level.stages.length}`}>
                {level.stages.map((s, i) => (
                  <span key={s.key} className={`${css.stageDot} ${i <= stageIndex ? css.stageDotOn : ''}`} />
                ))}
              </span>
            )}
          </p>
          <h1 className={css.goal}>{stage.goal}</h1>
        </div>

        <div className="prose">
          <p>{stage.intro}</p>
        </div>

        {isLogic && (
          <TruthTable
            rows={result.rows}
            inputLabels={level.inputLabels ?? ['x₁', 'x₂']}
            activeInput={inputs}
            onPickRow={(input) => state.setInputs(input)}
            caption="Press a row to run it through the network."
          />
        )}

        <div className={css.status}>
          <div className={css.tally}>
            <span className={css.tallyBig}>
              {result.correct}/{result.total}
            </span>
            <span>{isLogic ? 'rows right' : 'points on the right side'}</span>
          </div>
          <p
            className={`${css.statusLine} ${result.solved && !blocked ? css.statusSolved : ''}`}
            role="status"
            aria-live="polite"
          >
            {blocked ?? result.message}
          </p>
          {level.escape && !escaped && attempts > 0 && (
            <p className={css.ceiling}>
              Best so far: {best} of {result.total}.
            </p>
          )}
        </div>

        {hintShown && <p className={css.hint}>{stage.hint}</p>}

        <div className={css.actions}>
          {!finished && (
            <Button variant="primary" onClick={check}>
              Check answer
            </Button>
          )}
          {!hintShown && (
            <Button variant="quiet" onClick={() => setHintShown(true)}>
              Show hint
            </Button>
          )}
          {editable && (
            <Button variant="quiet" onClick={state.reset}>
              Start over
            </Button>
          )}
          {showEscape && (
            <Button onClick={applyEscape}>{level.escape!.label}</Button>
          )}
        </div>

        {nudge && !hintShown && !finished && (
          <p className={css.nudge}>Stuck? There is a hint whenever you want it.</p>
        )}

        {escaped && level.escape && (
          <p className={css.hint}>{level.escape.note}</p>
        )}

        {checked && !result.solved && !finished && (
          <p className={css.nudge}>
            Nothing is broken — keep adjusting and press Check answer again.
          </p>
        )}

        {finished && (
          <div className={css.learned}>
            <p className={css.learnedLabel}>
              <span>What you just worked out</span>
              <Pips count={awarded} label={`${awarded} of 3 for confidence`} />
            </p>
            <div className="prose">
              <p>{stage.learned}</p>
            </div>
            <div className={css.actions}>
              {!lastStage ? (
                <Button variant="primary" onClick={nextStage}>
                  Next part
                </Button>
              ) : isUnlocked(level.id + 1) && getLevel(level.id + 1) ? (
                <Button variant="primary" onClick={() => navigate(`/play/${level.id + 1}`)}>
                  Level {level.id + 1}
                </Button>
              ) : (
                <Link to="/play">
                  <Button variant="primary">Back to the levels</Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Which input to show first. For the logic levels that is the last row of the
 * truth table — all ones — because a network sitting on (0, 0) with every
 * weight at zero shows the player nothing at all.
 */
function startingInput(level: { stages: { dataset: { kind: string; points: { x: number[] }[] } }[] }): number[] {
  const points = level.stages[0].dataset.points;
  const point = level.stages[0].dataset.kind === 'logic' ? points[points.length - 1] : points[0];
  return [...point.x];
}

function NotBuiltYet({ id }: { id: number }) {
  return (
    <div className={css.page}>
      <div className={css.column} style={{ borderLeft: 0 }}>
        <h1 className="h-page">Level {id} is still being built</h1>
        <div className="prose">
          <p>Come back in a moment. In the meantime, the earlier levels are all playable.</p>
        </div>
        <Link to="/play">
          <Button variant="primary">Back to the levels</Button>
        </Link>
      </div>
    </div>
  );
}

