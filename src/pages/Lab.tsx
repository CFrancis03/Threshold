import { useState } from 'react';
import css from './Lab.module.css';
import { NetworkView } from '../components/NetworkView/NetworkView';
import { Inspector } from '../components/Inspector/Inspector';
import { Button, Plate, SegmentedControl } from '../components/ui/Controls';
import { useNetworkState } from '../state/useNetworkState';
import { createNetwork, randomize } from '../nn/network';

type ShapeId = '2-1' | '2-2-1' | '2-4-1' | '2-4-3-1' | '3-6-6-2';

const SHAPES: Record<ShapeId, number[]> = {
  '2-1': [2, 1],
  '2-2-1': [2, 2, 1],
  '2-4-1': [2, 4, 1],
  '2-4-3-1': [2, 4, 3, 1],
  '3-6-6-2': [3, 6, 6, 2],
};

/**
 * A scratch page for building and tuning the visualiser on its own, away from
 * any level logic. Reachable at #/lab; nothing links to it.
 */
export function Lab() {
  const [shapeId, setShapeId] = useState<ShapeId>('2-2-1');
  const shape = SHAPES[shapeId];
  const state = useNetworkState(createNetwork(shape, { seed: 5 }), [1, 0, 1].slice(0, shape[0]));
  const [seed, setSeed] = useState(5);

  const rebuild = (id: ShapeId) => {
    setShapeId(id);
    const next = SHAPES[id];
    state.replace(createNetwork(next, { seed }), true);
    state.setInputs([1, 0, 1].slice(0, next[0]));
  };

  return (
    <div className={css.page}>
      <div className={css.instrument}>
        <div className={css.controls}>
          <SegmentedControl<ShapeId>
            label="Network shape"
            value={shapeId}
            options={(Object.keys(SHAPES) as ShapeId[]).map((k) => ({ value: k, label: k }))}
            onChange={rebuild}
          />
          <Button
            size="small"
            onClick={() => {
              const next = seed + 1;
              setSeed(next);
              state.setNet(randomize(state.net, next));
            }}
          >
            Shuffle weights
          </Button>
          <Button size="small" onClick={state.reset}>
            Reset
          </Button>
          <Button size="small" onClick={() => state.setInputs(state.inputs.slice())}>
            Send a signal
          </Button>
        </div>

        <Plate title="Live network">
          <NetworkView
            net={state.net}
            inputs={state.inputs}
            onChange={state.setNet}
            selected={state.selected}
            onSelect={state.setSelected}
            onInputToggle={state.toggleInput}
            pulseKey={state.pulse}
            caption="Drag an edge or a neuron up and down. Tab to focus one, then use the arrow keys."
          />
        </Plate>
      </div>

      <div className={css.side}>
        <Inspector
          net={state.net}
          inputs={state.inputs}
          selected={state.selected}
          onChange={state.setNet}
          onClose={() => state.setSelected(null)}
          allowActivationChange
        />
      </div>
    </div>
  );
}
