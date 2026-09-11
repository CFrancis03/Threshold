import { useState } from 'react';
import css from './Landing.module.css';
import { NetworkView } from '../components/NetworkView/NetworkView';
import { Ledger } from '../components/Ledger/Ledger';
import { Button, Plate } from '../components/ui/Controls';
import { useNetworkState } from '../state/useNetworkState';
import { useProgress } from '../state/useProgress';
import { Link, navigate } from '../router';
import { createNetwork, setBias, setWeight } from '../nn/network';

/** A neuron already doing something, so the first drag changes a real answer. */
function heroNetwork() {
  let net = createNetwork([2, 1]);
  net = setWeight(net, 0, 0, 0, 3.2);
  net = setWeight(net, 0, 0, 1, -2.4);
  net = setBias(net, 0, 0, -0.6);
  return net;
}

export function Landing() {
  const { furthestUnlocked, progress } = useProgress();
  const state = useNetworkState(heroNetwork(), [1, 0]);
  const [touched, setTouched] = useState(false);
  const started = Object.keys(progress.completed).length > 0;

  const change = (next: Parameters<typeof state.setNet>[0]) => {
    setTouched(true);
    state.setNet(next);
  };

  return (
    <div className={css.page}>
      <div className={css.hero}>
        <div style={{ display: 'grid', gap: 'var(--s-3)' }}>
          <Plate title="A neuron">
            <NetworkView
              net={state.net}
              inputs={state.inputs}
              onChange={change}
              selected={state.selected}
              onSelect={(ref) => {
                setTouched(true);
                state.setSelected(ref);
              }}
              onInputToggle={(i) => {
                setTouched(true);
                state.toggleInput(i);
              }}
              pulseKey={state.pulse}
              inputLabels={['input 1', 'input 2']}
              outputLabels={['output']}
              layoutOptions={{ maxRadius: 30, gap: 44, padY: 40 }}
              title="A single neuron with two inputs. Drag a connection or a neuron to change it."
            />
          </Plate>
          <p className={`${css.invite} ${touched ? '' : css.inviteLive}`}>
            {touched ? (
              'Everything moved together: the weight, the sum, and the answer.'
            ) : (
              <>
                <span className={css.arrow} aria-hidden="true" />
                Drag one of those lines up or down.
              </>
            )}
          </p>
        </div>

        <Ledger net={state.net} inputs={state.inputs} layer={0} neuron={0} />
      </div>

      <div className={css.pitch}>
        <h1 className={css.headline}>
          A neural network is a pile of numbers you can reach in and change.
        </h1>
        <div className="prose">
          <p>
            Seven short puzzles that build one up from a single neuron, by hand, until you hand the
            job over to the machine and watch it learn. No maths past algebra, no jargon left
            unexplained.
          </p>
        </div>
        <div className={css.actions}>
          <Button variant="primary" onClick={() => navigate(`/play/${started ? furthestUnlocked : 1}`)}>
            {started ? `Carry on with level ${furthestUnlocked}` : 'Start level 1'}
          </Button>
          <span className={css.aside}>
            Or skip to the <Link to="/sandbox">sandbox</Link>, or read{' '}
            <Link to="/how">how it works</Link>.
          </span>
        </div>
      </div>

      <p className={css.meta}>
        <span>About twenty minutes. Your progress stays in this browser.</span>
      </p>
    </div>
  );
}
