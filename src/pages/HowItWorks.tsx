import { useState, type ReactNode } from 'react';
import css from './HowItWorks.module.css';
import { NetworkView } from '../components/NetworkView/NetworkView';
import { Ledger } from '../components/Ledger/Ledger';
import { BoundaryCanvas, MiniBoundary, miniRowClass } from '../components/Boundary/BoundaryCanvas';
import { TrainPanel } from '../components/TrainPanel';
import { Button, Plate, SegmentedControl } from '../components/ui/Controls';
import { useNetworkState } from '../state/useNetworkState';
import { navigate, Link } from '../router';
import { createNetwork, setHiddenActivation } from '../nn/network';
import { makeCircle, makeTwoClusters, XOR } from '../nn/datasets';
import { level4 } from '../game/levels/level4';
import { level3 } from '../game/levels/level3';
import { activationNames } from '../nn/activations';
import type { ActivationName } from '../nn/types';

const CLUSTERS = makeTwoClusters();
const CIRCLE = makeCircle();

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={css.section}>
      <h2 className={css.h}>{title}</h2>
      {children}
    </section>
  );
}

/**
 * The reading version, for anyone who wants the idea without the puzzles —
 * or who has finished them and wants it written down.
 *
 * Every diagram on this page is the same live component the game uses, not a
 * picture of one. If you do not believe a sentence, you can go and disturb it.
 */
export function HowItWorks() {
  const one = useNetworkState(createNetwork([2, 1], { seed: 47 }), [1, 0]);
  const line = useNetworkState(level3.solution(), [0.4, 0.4]);
  const xor = useNetworkState(level4.solution(), [1, 0]);
  const learner = useNetworkState(createNetwork([2, 5, 1], { hidden: 'tanh', output: 'sigmoid', seed: 4 }), [0.3, 0.3]);
  const squashDemo = useNetworkState(level4.solution(), [1, 0]);
  const [squash, setSquash] = useState<ActivationName>('sigmoid');

  return (
    <div className={css.page}>
      <div className={css.lede}>
        <h1 className="h-page">How it works</h1>
        <div className="prose" style={{ marginTop: 'var(--s-3)' }}>
          <p>
            The whole idea fits on one page. Everything below is live: the diagrams are the same
            ones the puzzles use, so you can take any of them apart while you read.
          </p>
        </div>
      </div>

      <Section title="A neuron is two kinds of number and a squash">
        <div className={css.split}>
          <div className={`${css.body} prose`}>
            <p>
              Give a neuron some inputs. It multiplies each one by a <strong>weight</strong>, adds
              the results together, then adds one more number called the <strong>bias</strong>.
              That total is usually written <em>z</em>.
            </p>
            <p>
              A weight says how much an input counts, and which way: positive weights argue for
              firing, negative ones argue against. The bias is the neuron's own opinion before any
              input arrives — it sets how much total is needed before anything happens.
            </p>
            <p>
              Then <em>z</em> goes through a squash, which flattens any number at all into a small,
              tidy range. Above 0.5 we say the neuron fired.
            </p>
          </div>
          <div className={css.demo}>
            <p className={css.formula}>
              z = (<b>w₁</b> × x₁) + (<b>w₂</b> × x₂) + <b>b</b>
              <br />
              output = squash(z)
            </p>
            <NetworkView
              net={one.net}
              inputs={one.inputs}
              onChange={one.setNet}
              selected={one.selected}
              onSelect={one.setSelected}
              onInputToggle={one.toggleInput}
              pulseKey={one.pulse}
            />
            <Ledger net={one.net} inputs={one.inputs} layer={0} neuron={0} />
          </div>
        </div>
      </Section>

      <Section title="One neuron draws one straight line">
        <div className={css.split}>
          <div className={`${css.body} prose`}>
            <p>
              Every possible pair of inputs is a point on a square, and the neuron has an answer at
              every one of them. Shade the square by that answer and a pattern appears: warm where
              the neuron fires, cool where it does not, with a hard edge between.
            </p>
            <p>
              That edge is always a straight line. The two weights decide which way it leans; the
              bias slides it back and forth without turning it. Drag anything in the diagram and
              watch which of those two things happens.
            </p>
          </div>
          <div className={css.demo}>
            <div className={css.demoRow}>
              <BoundaryCanvas net={line.net} dataset={CLUSTERS} caption="warm = fires, cool = does not" />
            </div>
            <NetworkView
              net={line.net}
              inputs={line.inputs}
              onChange={line.setNet}
              selected={line.selected}
              onSelect={line.setSelected}
              pulseKey={line.pulse}
              inputLabels={['x', 'y']}
            />
          </div>
        </div>
      </Section>

      <Section title="A hidden layer turns lines into shapes">
        <div className={css.split}>
          <div className={`${css.body} prose`}>
            <p>
              One line is not always enough. XOR wants the two corners on one diagonal kept apart
              from the two on the other, and no straight line can do that — not a badly chosen one,
              not any of them.
            </p>
            <p>
              So put a layer in between. Each neuron in that hidden layer draws its own line and
              reports which side you landed on. The output neuron never sees the original inputs at
              all; it only weighs up those reports. Two lines, combined, make a corner — and a
              corner is enough for XOR.
            </p>
            <p>
              That is the whole trick, repeated. Enough detectors, combined by enough layers, and
              the shapes get as complicated as you like.
            </p>
          </div>
          <div className={css.demo}>
            <NetworkView
              net={xor.net}
              inputs={xor.inputs}
              onChange={xor.setNet}
              selected={xor.selected}
              onSelect={xor.setSelected}
              onInputToggle={xor.toggleInput}
              pulseKey={xor.pulse}
            />
            <div className={css.demoRow}>
              <BoundaryCanvas net={xor.net} dataset={XOR} caption="XOR, solved by two hidden neurons" />
              <div>
                <p className="caption" style={{ marginBottom: 'var(--s-2)' }}>
                  each hidden neuron on its own
                </p>
                <div className={miniRowClass}>
                  <MiniBoundary net={xor.net} dataset={XOR} layer={0} neuron={0} label="hidden 1" />
                  <MiniBoundary net={xor.net} dataset={XOR} layer={0} neuron={1} label="hidden 2" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section title="The squash is not a detail">
        <div className={css.split}>
          <div className={`${css.body} prose`}>
            <p>
              Without a squash, a stack of layers collapses: a chain of multiply-and-add steps is
              just one big multiply-and-add, and the whole network could only ever draw one straight
              line again. The squash is what buys the curves.
            </p>
            <p>
              Which one you pick changes the shape of everything downstream. Swap between them and
              watch the boundary — and note that the step function, the most obvious choice, is the
              one that cannot be trained at all, because its slope is zero everywhere.
            </p>
          </div>
          <div className={css.demo}>
            <SegmentedControl<ActivationName>
              label="Squash"
              value={squash}
              options={activationNames.filter((n) => n !== 'linear').map((n) => ({ value: n, label: n }))}
              onChange={(n) => {
                setSquash(n);
                squashDemo.setNet(setHiddenActivation(squashDemo.net, n));
              }}
            />
            <BoundaryCanvas
              net={squashDemo.net}
              dataset={XOR}
              caption={`the same XOR network, hidden layer using ${squash}`}
            />
          </div>
        </div>
      </Section>

      <Section title="Training is just nudging, over and over">
        <div className={css.split}>
          <div className={`${css.body} prose`}>
            <p>
              So far you have been setting the weights. A network can find them itself, and the
              method is less clever than it sounds.
            </p>
            <p>
              Measure how wrong the answers are — one number, called the loss. Then, for every
              single weight, work out whether nudging it up or down would make that number smaller.
              Take a small step in the better direction. Repeat.
            </p>
            <p>
              <strong>Backpropagation</strong> is the efficient way to get all those answers at
              once. Starting at the output, where "how wrong" is obvious, it passes the blame
              backwards along the same connections the signal came down, so each weight learns its
              share in one sweep instead of being tested one at a time.
            </p>
            <p>
              The <strong>learning rate</strong> is how big each step is. Too small and it crawls;
              too big and it overshoots and thrashes. Try both below.
            </p>
          </div>
          <div className={css.demo}>
            <Plate title="A network learning the circle">
              <NetworkView
                net={learner.net}
                inputs={learner.inputs}
                onChange={learner.setNet}
                selected={null}
                editable={false}
                pulseKey={learner.pulse}
                showReadouts={false}
                inputLabels={['x', 'y']}
              />
            </Plate>
            <div className={css.demoRow}>
              <BoundaryCanvas net={learner.net} dataset={CIRCLE} caption="the boundary, as it learns" />
            </div>
            <TrainPanel
              net={learner.net}
              onNet={learner.setNet}
              data={CIRCLE.points}
              defaultLearningRate={0.5}
              onStartOver={learner.reset}
            />
          </div>
        </div>
      </Section>

      <div className={css.end}>
        <Button variant="primary" onClick={() => navigate('/play/1')}>
          Start level 1
        </Button>
        <p className="caption">
          Or open the <Link to="/sandbox">sandbox</Link> and build one yourself. All the maths on
          this page lives in <span className="num">src/nn/</span>, written out longhand and
          commented — no libraries.
        </p>
      </div>
    </div>
  );
}
