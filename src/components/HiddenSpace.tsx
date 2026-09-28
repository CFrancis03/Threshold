import { useMemo } from 'react';
import css from './HiddenSpace.module.css';
import { BoundaryCanvas } from './Boundary/BoundaryCanvas';
import { Plate } from './ui/Controls';
import { countCoincident, hiddenSpaceView } from '../nn/hiddenSpace';
import type { Dataset } from '../nn/datasets';
import type { Network } from '../nn/types';

export interface HiddenSpaceProps {
  net: Network;
  dataset: Dataset;
}

/**
 * The same training points, seen from the output neuron's side.
 *
 * In the input square the two classes are tangled. Here every point has been
 * moved to wherever the two hidden neurons put it, and the output neuron's
 * single straight line has to separate them. Watching that picture untangle as
 * you tune the hidden layer is the clearest way to see what a hidden layer is
 * for: it does not add new power to the last neuron, it changes what the last
 * neuron is looking at.
 *
 * Renders nothing unless the last hidden layer has exactly two neurons, since
 * a third would need a third axis.
 */
export function HiddenSpace({ net, dataset }: HiddenSpaceProps) {
  const view = useMemo(() => hiddenSpaceView(net, dataset), [net, dataset]);
  const together = useMemo(() => (view ? countCoincident(view) : 0), [view]);
  if (!view) return null;

  return (
    <Plate title="Hidden space" aside={<span className="caption">what the output neuron actually sees</span>}>
      <div className={css.row}>
        <BoundaryCanvas
          net={view.net}
          dataset={view.dataset}
          className={css.canvas}
          label="Hidden space. Each training point is drawn where the two hidden neurons place it, with the output neuron's boundary drawn through them. Warm means the output neuron fires."
          caption="across: what hidden 1 says · up: what hidden 2 says"
        />
        <div className={css.words}>
          <p>
            The output neuron never sees the original inputs. It only hears what these two hidden
            neurons say about them, so here each point sits where the hidden layer puts it.
          </p>
          <p>
            Its one straight line has to split the round dots from the square ones.{' '}
            <span className={css.quiet}>
              Change a hidden weight and watch the points move: the hidden layer’s whole job is to
              shuffle them until a single line is enough.
            </span>
          </p>
          {together > 0 && (
            <p>
              Count the marks. Two of the inputs have landed on the very same spot, so as far as the
              output neuron can tell they are now the same input. That is fine here, because XOR
              wants the same answer for both.
            </p>
          )}
        </div>
      </div>
    </Plate>
  );
}
