import { useMemo, useState } from 'react';
import css from './CollapseDemo.module.css';
import { BoundaryCanvas } from './Boundary/BoundaryCanvas';
import { SegmentedControl } from './ui/Controls';
import { collapseDemoNet, collapseLinear } from '../nn/collapse';
import { signed } from '../lib/format';
import type { Dataset } from '../nn/datasets';

type Squash = 'linear' | 'tanh';

/** A blank square to paint on: this demo is about shapes, not data. */
const SQUARE: Dataset = {
  id: 'square',
  label: 'The input square',
  kind: 'cloud',
  domain: [
    [-1, 1],
    [-1, 1],
  ],
  points: [],
};

/**
 * Three hidden neurons, with and without a squash.
 *
 * With no squash, the hidden layer and the output multiply out into a single
 * neuron whose weights are printed underneath — and its picture is identical to
 * the whole network's. That is the proof, not a description of it. Put tanh in
 * the way and the multiplication stops being valid, and the boundary bends.
 */
export function CollapseDemo() {
  const [squash, setSquash] = useState<Squash>('linear');
  const net = useMemo(() => collapseDemoNet(squash), [squash]);
  const collapsed = useMemo(() => collapseLinear(net), [net]);

  const single = collapsed?.layers[0];
  const [wx, wy] = single?.weights[0] ?? [0, 0];

  return (
    <div className={css.wrap}>
      <SegmentedControl<Squash>
        label="Squash in the hidden layer"
        value={squash}
        options={[
          { value: 'linear', label: 'none' },
          { value: 'tanh', label: 'tanh' },
        ]}
        onChange={setSquash}
      />

      <div className={css.panes}>
        <div className={css.pane}>
          <span className={css.paneTitle}>Three hidden neurons</span>
          <BoundaryCanvas
            net={net}
            dataset={SQUARE}
            showPoints={false}
            label={`The boundary of a network with three hidden neurons${squash === 'linear' ? ' and no squash. It is a straight line' : ' using tanh. It bends'}.`}
          />
        </div>

        <div className={css.pane}>
          <span className={css.paneTitle}>One neuron</span>
          {collapsed ? (
            <BoundaryCanvas
              net={collapsed}
              dataset={SQUARE}
              showPoints={false}
              label="The boundary of the single neuron you get by multiplying the layers together. It is the same straight line."
            />
          ) : (
            <div className={css.blocked}>
              The squash gets in the way, so the layers can’t be multiplied out. The boundary bends.
            </div>
          )}
        </div>
      </div>

      {collapsed ? (
        <>
          <p className={css.equation}>
            weights ({signed(wx)}, {signed(wy)}), bias {signed(single!.biases[0])}
          </p>
          <p className={css.verdict}>
            Multiply the layers together and the three hidden neurons become one neuron, with those
            weights. The two pictures are the same because the two networks are the same. Any number
            of layers with no squash between them ends up here.
          </p>
        </>
      ) : (
        <p className={css.verdict}>
          Put a squash between the layers and there is nothing to multiply out: the three neurons
          each bend the picture before the next layer sees it, and a boundary that isn’t straight
          becomes possible.
        </p>
      )}
    </div>
  );
}
