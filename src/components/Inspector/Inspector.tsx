import { useEffect } from 'react';
import css from './Inspector.module.css';
import { Ledger } from '../Ledger/Ledger';
import { Button, SegmentedControl, Slider } from '../ui/Controls';
import { describeParam, type NameOptions } from '../NetworkView/labels';
import { getBias, getWeight, setActivation, setBias, setWeight } from '../../nn/network';
import { activationNames } from '../../nn/activations';
import type { ActivationName, Network, ParamRef } from '../../nn/types';
import { useIsNarrow } from '../../lib/motion';

export interface InspectorProps {
  net: Network;
  inputs: number[];
  selected: ParamRef | null;
  onChange: (next: Network) => void;
  onClose: () => void;
  names?: NameOptions;
  editable?: boolean;
  /** Let the player swap this layer's activation function (level 6, sandbox). */
  allowActivationChange?: boolean;
  threshold?: number;
}

/**
 * The precise-control panel behind every click on the diagram.
 *
 * Selecting an edge opens the ledger of the neuron that edge feeds, with that
 * term picked out — so "what does this weight do?" is answered by showing the
 * sum it lands in, not by a number in isolation.
 */
export function Inspector({
  net,
  inputs,
  selected,
  onChange,
  onClose,
  names,
  editable = true,
  allowActivationChange = false,
  threshold = 0.5,
}: InspectorProps) {
  const narrow = useIsNarrow();

  // Escape closes the sheet, the same as anywhere else on the web.
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, onClose]);

  if (!selected) {
    return (
      <div className={css.panel}>
        <p className={css.empty}>
          Click a connection or a neuron to open it up. Or drag one up and down to change it on the spot.
        </p>
      </div>
    );
  }

  const value =
    selected.kind === 'weight'
      ? getWeight(net, selected.layer, selected.to, selected.from)
      : getBias(net, selected.layer, selected.to);

  const apply = (v: number) =>
    onChange(
      selected.kind === 'weight'
        ? setWeight(net, selected.layer, selected.to, selected.from, v)
        : setBias(net, selected.layer, selected.to, v),
    );

  return (
    <div className={`${css.panel} ${narrow ? css.sheet : ''}`} role="group" aria-label="Inspector">
      <div className={css.grabber} aria-hidden="true" />
      <div className={css.head}>
        <span className={css.what}>{describeParam(net, selected, names)}</span>
        <Button variant="quiet" size="small" onClick={onClose} aria-label="Close the inspector">
          Close
        </Button>
      </div>

      <Slider
        label={selected.kind === 'weight' ? 'Weight' : 'Bias'}
        value={value}
        onChange={apply}
        min={-8}
        max={8}
        step={0.01}
        disabled={!editable}
        note={
          selected.kind === 'weight'
            ? 'how strongly this input counts'
            : 'how easy this neuron is to switch on'
        }
      />

      {allowActivationChange && (
        <div>
          <p className={css.hintRow} id="squash-label">
            Squash used by this layer
          </p>
          <SegmentedControl<ActivationName>
            label="Activation function"
            value={net.layers[selected.layer].activation}
            options={activationNames
              .filter((n) => n !== 'linear')
              .map((n) => ({ value: n, label: n }))}
            onChange={(n) => onChange(setActivation(net, selected.layer, n))}
          />
        </div>
      )}

      <Ledger
        net={net}
        inputs={inputs}
        layer={selected.layer}
        neuron={selected.to}
        names={names}
        threshold={threshold}
        highlight={selected.kind === 'weight' ? selected.from : 'bias'}
        flat
      />
    </div>
  );
}
