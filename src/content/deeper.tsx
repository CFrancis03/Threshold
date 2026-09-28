import type { ComponentType } from 'react';
import { CollapseDemo } from '../components/CollapseDemo';
import { GradientDescent1D } from '../components/GradientDescent1D';
import { countParams } from '../nn/network';
import type { Dataset } from '../nn/datasets';
import type { Network } from '../nn/types';

/**
 * The layer of explanation under each level.
 *
 * The level itself stays as short as it was designed to be: a sentence or two,
 * a puzzle, a note on what you just learned. This is for anyone who wants to
 * know *why*. It is written in the voice of someone at a whiteboard, and it is
 * spoiler-safe: none of it hands over the answer to the level it sits under,
 * because it is open to you while you are still stuck.
 */

export interface DeeperProps {
  net: Network;
  dataset: Dataset;
}

export interface Deeper {
  title: string;
  Body: ComponentType<DeeperProps>;
  /**
   * Hold this back until the hidden layer has been offered and taken. Level 4's
   * note is about what that layer does, so showing it earlier would give away
   * the ending of the level it belongs to.
   */
  after?: 'escape';
}

/** Weights and inputs, set the way the site sets them everywhere. */
const W1 = () => (
  <>
    w<sub>1</sub>
  </>
);
const W2 = () => (
  <>
    w<sub>2</sub>
  </>
);
const X1 = () => (
  <>
    x<sub>1</sub>
  </>
);
const X2 = () => (
  <>
    x<sub>2</sub>
  </>
);

function Threshold() {
  return (
    <>
      <p>
        Watch the ledger while you drag. The neuron fires when the sum, <em>z</em>, is above zero, and{' '}
        <em>z</em> is the weighted inputs plus the bias. So it fires when{' '}
        <span className="num">
          <W1 />
          <X1 /> + <W2 />
          <X2 /> + b &gt; 0
        </span>
        , which is the same as saying it fires when{' '}
        <span className="num">
          <W1 />
          <X1 /> + <W2 />
          <X2 />
        </span>{' '}
        is bigger than <span className="num">−b</span>.
      </p>
      <p>
        Read that second version out loud. The weighted inputs have to add up to more than −b before
        anything happens, so the bias is the threshold with its sign flipped. A bias of −4 means “you
        need a total above 4.” Raise the bias and the neuron is easier to set off; lower it and it gets
        pickier. That is where this site gets its name.
      </p>
      <p>
        Here is the same idea with something you can picture. A neuron deciding whether to take an
        umbrella might weigh “chance of rain” heavily (+4) and “it’s already sunny” against (−3), with a
        bias of −2. It fires when 4 × rain − 3 × sun is more than 2. The weights say which evidence
        matters and which way it points; the bias says how much evidence is enough.
      </p>
      <p>
        Why squash the total into 0 to 1 instead of giving a plain yes or no? Because a squash keeps how
        close the call was. 0.51 means barely; 0.98 means no doubt. That confidence is what the pips
        measure, and it is what makes training possible later on.
      </p>
    </>
  );
}

function ThreeJobs() {
  return (
    <>
      <p>
        You did AND, OR and NAND with the same neuron by changing three numbers. Nothing was added or
        taken away: the weights were the program.
      </p>
      <p>
        NAND has a claim to fame. Every digital circuit, every processor and memory chip, can be built
        out of NAND gates alone, which is why it is called a universal gate. A single neuron can be a
        NAND gate, so a network of them can, in principle, compute anything a logic circuit can. The
        difference is who chooses the wiring. On a chip an engineer does. In a network, training does,
        which is where you are headed.
      </p>
      <p>
        The negative weights you used are also the general trick for saying “not”. A neuron with a
        single negative weight and a positive bias is a NOT gate: it fires when its input is off, and
        stays quiet when it is on.
      </p>
    </>
  );
}

function WhereTheLineComes() {
  return (
    <>
      <p>
        The boundary is every point where the sum is exactly zero:{' '}
        <span className="num">
          <W1 />x + <W2 />y + b = 0
        </span>
        . That is the equation of a straight line, which is why one neuron can only ever draw one.
      </p>
      <p>
        Two things are worth knowing about that line. First, the weights point across it. Switch on the
        arrow under the picture and you will see that it always stands at right angles to the boundary
        and aims at the side that fires. Change the weights and the line swings round to stay square to
        the arrow. Second, the bias slides the line without turning it: with the weights held fixed, the
        further the bias is from zero, the further the line sits from the centre.
      </p>
      <p>
        Try multiplying both weights and the bias by the same amount. The line stays exactly where it
        was, but the shading either side of it sharpens: the same line with a steeper squash. That is
        the difference between “a bit warmer over here” and “definitely on.”
      </p>
    </>
  );
}

function WhatTheHiddenLayerDoes() {
  return (
    <>
      <p>
        The output neuron still draws a single straight line. It has not gained any new power. What
        changed is what it is drawing the line through.
      </p>
      <p>
        Look at the hidden-space picture beside the network. Every point of the original square has been
        moved to sit at (what the first hidden neuron says, what the second one says). In the original
        square the two classes were tangled: the ones that should fire sat on opposite corners. After the
        hidden layer they have been moved, and one straight line separates them. The hidden layer’s
        whole job is to re-describe the data so that a straight line is enough.
      </p>
      <p>
        That is what people mean when they say a deep network learns a representation. Each layer
        re-describes the answer of the one before, until the last neuron has an easy job. Nobody tells
        the hidden layer what to compute; in level 7 you will watch a network work that out for itself.
      </p>
    </>
  );
}

function TheAndYouBuilt() {
  return (
    <>
      <p>
        Look at the output neuron in this level: four inputs, all with the same positive weight, and a
        large negative bias. It fires only when all four hidden neurons fire. That is AND, the same
        neuron you built in level 1, except that its inputs are now the answers of other neurons rather
        than raw data.
      </p>
      <p>
        That is the pattern in every network: neurons doing simple jobs on each other’s answers. Each
        hidden neuron here answers one small question, “am I on the inner side of this edge?” The output
        answers a bigger one that is built out of those.
      </p>
      <p>
        Four lines fence a square. Add more hidden neurons and you can fence more sides: eight make a
        decent octagon, and a great many make something you could not tell from a circle. That is the
        intuition behind a famous result, that with enough hidden neurons a network can approximate
        essentially any shape. “Enough” can be a lot, and finding the weights is the harder question,
        which is what training is for.
      </p>
    </>
  );
}

function WhyLayersCantJustStack() {
  return (
    <>
      <p>
        Try stacking two layers with no squash at all. The second layer multiplies what the first
        produced and adds its own bias, so the pair works out to (second weights × first weights)
        applied to the input, plus a new bias. That has exactly the form of a single layer. Two layers
        with no squash are one layer in disguise, and so are a hundred.
      </p>
      <CollapseDemo />
      <p>
        So the squash is not decoration. It is the only thing stopping a deep network from folding down
        into a single straight line.
      </p>
      <p>
        Which one, then? Sigmoid and tanh are smooth, but they flatten out at both ends, and a flat spot
        has almost no slope, so the weights feeding a saturated neuron barely get nudged when the
        network trains. ReLU is flat on only one side and never levels off on the other, which is a big
        part of why it is the usual default in large networks today. The step function has no slope
        anywhere, so it cannot be trained at all, which is why you could not keep it.
      </p>
    </>
  );
}

function WhatBackpropDoes({ net }: DeeperProps) {
  const n = countParams(net);
  return (
    <>
      <p>
        Training needs one thing for every weight: which way should I nudge it, and by how much? That
        number is the weight’s slope. It says how much the loss changes when the weight goes up by a
        hair.
      </p>
      <p>
        You can measure a slope directly. Nudge the weight up a little, run the network again, see how
        far the loss moved, and divide. It works, and it is exactly what the slope readout below does.
        But it costs a full run of the network for every weight. This network has {n} weights and
        biases, so measuring every slope that way would take {2 * n} extra runs for every single step.
      </p>
      <GradientDescent1D />
      <p>
        The learning rate is how far you step along the slope each time. Small rates crawl. A rate of
        exactly one half lands on the bottom in one step here, because this bowl is so regular. Bigger
        rates overshoot and bounce, and past one the bounces get larger each time until the ball flies
        off. Real networks are less tidy, but the same behaviours show up, which is why the learning
        rate slider in this level is there.
      </p>
      <p>
        Backpropagation is the shortcut. The output is wrong by some amount. That blame is shared out
        among the neurons feeding the output, in proportion to their weights; each of those shares its
        part among the neurons feeding it, and so on back to the inputs. By the time the blame reaches a
        weight, it has turned into that weight’s slope. One sweep backwards gives all {n} slopes for
        roughly the price of one more run, which is what makes training networks with millions of
        weights possible at all.
      </p>
    </>
  );
}

export const deeper: Record<number, Deeper> = {
  1: { title: 'Why it’s called a threshold', Body: Threshold },
  2: { title: 'Three jobs, one neuron', Body: ThreeJobs },
  3: { title: 'Where the line comes from', Body: WhereTheLineComes },
  4: { title: 'What the hidden layer does', Body: WhatTheHiddenLayerDoes, after: 'escape' },
  5: { title: 'The AND you already built', Body: TheAndYouBuilt },
  6: { title: 'Why layers can’t just stack', Body: WhyLayersCantJustStack },
  7: { title: 'What backpropagation is really doing', Body: WhatBackpropDoes },
};
