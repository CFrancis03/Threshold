import { useMemo, useState } from 'react';
import css from './Sandbox.module.css';
import { NetworkView } from '../components/NetworkView/NetworkView';
import { Inspector } from '../components/Inspector/Inspector';
import { Ledger } from '../components/Ledger/Ledger';
import { BoundaryCanvas } from '../components/Boundary/BoundaryCanvas';
import { TrainPanel } from '../components/TrainPanel';
import { Button, Plate, SegmentedControl } from '../components/ui/Controls';
import { useNetworkState } from '../state/useNetworkState';
import { useProgress } from '../state/useProgress';
import { Link } from '../router';
import {
  addLayer,
  addNeuron,
  createNetwork,
  randomize,
  removeLayer,
  removeNeuron,
  setHiddenActivation,
  shapeOf,
} from '../nn/network';
import { activationNames } from '../nn/activations';
import { datasets, makeCustom, type Dataset, type DatasetId } from '../nn/datasets';
import { evaluate } from '../game/evaluate';
import type { ActivationName, Sample } from '../nn/types';

type Choice = DatasetId | 'custom';

const DATASET_OPTIONS: Array<{ value: Choice; label: string }> = [
  { value: 'clusters', label: 'two clusters' },
  { value: 'xor', label: 'XOR' },
  { value: 'circle', label: 'circle' },
  { value: 'ring', label: 'ring' },
  { value: 'spiral', label: 'spiral' },
  { value: 'custom', label: 'your own' },
];

const MAX_HIDDEN_LAYERS = 3;
const MAX_NEURONS = 8;

/**
 * Everything the game held back, with nothing to get right.
 *
 * The same components as the levels, minus the win condition — which is the
 * point: having spent twenty minutes being told what to make, you get to find
 * out what happens when nobody is asking for anything.
 */
export function Sandbox() {
  const { progress } = useProgress();
  const [choice, setChoice] = useState<Choice>('circle');
  const [custom, setCustom] = useState<Sample[]>([]);
  const [seed, setSeed] = useState(1);

  const state = useNetworkState(createNetwork([2, 4, 1], { hidden: 'tanh', output: 'sigmoid', seed: 1 }), [0.3, 0.3]);
  const { net, setNet, inputs, selected, setSelected } = state;

  const dataset: Dataset = useMemo(
    () => (choice === 'custom' ? makeCustom(custom) : datasets[choice]),
    [choice, custom],
  );

  const shape = shapeOf(net);
  const hiddenCount = net.layers.length - 1;
  const result = useMemo(() => evaluate(net, dataset), [net, dataset]);
  const outputLayer = net.layers.length - 1;

  /** Click adds a class-1 point; shift or alt adds a class-0 point. */
  const placePoint = (x: number, y: number, alt: boolean) => {
    if (choice !== 'custom') return;
    setCustom((prev) => [...prev, { x: [x, y], y: [alt ? 0 : 1] }]);
  };

  return (
    <div className={css.page}>
      <div className={css.instrument}>
        <Plate
          title="Sandbox"
          aside={
            <SegmentedControl<ActivationName>
              label="Squash used by the hidden layers"
              value={net.layers[0].activation}
              options={activationNames
                .filter((n) => n !== 'linear')
                .map((n) => ({ value: n, label: n }))}
              onChange={(n) => setNet(setHiddenActivation(net, n))}
            />
          }
        >
          <div className={css.stack}>
            <div className={css.stackMain}>
              <NetworkView
                net={net}
                inputs={inputs}
                onChange={setNet}
                selected={selected}
                onSelect={setSelected}
                pulseKey={state.pulse}
                inputLabels={['x', 'y']}
              />
            </div>
            <div className={css.stackSide}>
              <BoundaryCanvas
                net={net}
                dataset={dataset}
                onPlacePoint={choice === 'custom' ? placePoint : undefined}
                caption={
                  choice === 'custom'
                    ? 'Click to add a point. Hold Shift to add one of the other class.'
                    : `${dataset.label} · ${result.correct} of ${result.total} on the right side`
                }
              />
            </div>
          </div>
        </Plate>

        <TrainPanel
          net={net}
          onNet={setNet}
          data={dataset.points}
          defaultLearningRate={0.3}
          onStartOver={() => setNet(randomize(net, seed + 1))}
        />

        {selected ? (
          <Inspector
            net={net}
            inputs={inputs}
            selected={selected}
            onChange={setNet}
            onClose={() => setSelected(null)}
            allowActivationChange
            names={{ inputLabels: ['x', 'y'] }}
          />
        ) : (
          <Ledger net={net} inputs={inputs} layer={outputLayer} neuron={0} names={{ inputLabels: ['x', 'y'] }} />
        )}
      </div>

      <div className={css.column}>
        {!progress.sandboxUnlocked && (
          <p className={css.note}>
            You have skipped ahead — that is allowed. <Link to="/play">The seven puzzles</Link> explain
            everything here, in order, in about twenty minutes.
          </p>
        )}

        <div className={css.group}>
          <span className={css.groupHead}>Data</span>
          <SegmentedControl<Choice>
            label="Dataset"
            value={choice}
            options={DATASET_OPTIONS}
            onChange={(v) => {
              setChoice(v);
              setSelected(null);
            }}
          />
          {choice === 'custom' && (
            <div className={css.row}>
              <Button size="small" onClick={() => setCustom([])} disabled={custom.length === 0}>
                Clear points
              </Button>
              <span className={css.note}>{custom.length} placed</span>
            </div>
          )}
        </div>

        <div className={css.group}>
          <span className={css.groupHead}>Shape</span>
          <div className={css.layers}>
            {net.layers.slice(0, -1).map((layer, i) => (
              <div key={i} className={css.layerRow}>
                <span className={css.layerName}>hidden layer {i + 1}</span>
                <span className={css.layerCount}>{layer.biases.length}</span>
                <Button
                  className={css.stepper}
                  aria-label={`Remove a neuron from hidden layer ${i + 1}`}
                  disabled={layer.biases.length <= 1}
                  onClick={() => setNet(removeNeuron(net, i, layer.biases.length - 1))}
                >
                  −
                </Button>
                <Button
                  className={css.stepper}
                  aria-label={`Add a neuron to hidden layer ${i + 1}`}
                  disabled={layer.biases.length >= MAX_NEURONS}
                  onClick={() => setNet(addNeuron(net, i))}
                >
                  +
                </Button>
              </div>
            ))}
          </div>
          <div className={css.row}>
            <Button
              size="small"
              disabled={hiddenCount >= MAX_HIDDEN_LAYERS}
              onClick={() => setNet(randomize(addLayer(net, hiddenCount, 4), seed))}
            >
              Add a layer
            </Button>
            <Button
              size="small"
              disabled={hiddenCount <= 1}
              onClick={() => setNet(removeLayer(net, hiddenCount - 1))}
            >
              Remove a layer
            </Button>
          </div>
          <span className={css.note}>{shape.join(' → ')}</span>
        </div>

        <div className={css.group}>
          <span className={css.groupHead}>Weights</span>
          <div className={css.row}>
            <Button
              size="small"
              onClick={() => {
                const next = seed + 1;
                setSeed(next);
                setNet(randomize(net, next));
              }}
            >
              Shuffle
            </Button>
            <Button size="small" onClick={() => setNet(createNetwork(shape, { hidden: net.layers[0].activation, output: 'sigmoid' }))}>
              Zero everything
            </Button>
          </div>
          <span className={css.note}>
            Or drag any connection. New layers start shuffled, because a layer of zeros has nothing
            for training to grip.
          </span>
        </div>
      </div>
    </div>
  );
}
