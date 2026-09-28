/**
 * The words the site uses, in plain language.
 *
 * Alphabetical, so a definition can be found without knowing what it is filed
 * under. Each says what the thing is and where it first turns up.
 */

export interface Term {
  /** Stable, url-safe, used for linking. */
  id: string;
  term: string;
  plain: string;
  /** Where you meet it, e.g. "Level 1". */
  where: string;
}

export const glossary: Term[] = [
  {
    id: 'activation',
    term: 'Activation',
    plain:
      'The number a neuron passes on after it has squashed its sum. The squashing function itself is called an activation function.',
    where: 'Levels 1 and 6',
  },
  {
    id: 'backpropagation',
    term: 'Backpropagation',
    plain:
      'The quick way to work out, for every weight at once, which way to nudge it. It starts at the output, where the error is obvious, and passes the blame backwards along the connections the signal came down.',
    where: 'Level 7',
  },
  {
    id: 'bias',
    term: 'Bias',
    plain:
      'A number added to a neuron’s sum whatever the inputs are. It sets how much evidence the neuron needs before it fires: the threshold, with its sign flipped.',
    where: 'Levels 1 and 2',
  },
  {
    id: 'boundary',
    term: 'Decision boundary',
    plain:
      'The line, or curve, where a network’s answer flips from below 0.5 to above it. One neuron can only draw a straight one.',
    where: 'Level 3',
  },
  {
    id: 'gradient',
    term: 'Gradient',
    plain:
      'A weight’s slope: how much the loss changes if the weight goes up by a hair. Training moves each weight the opposite way to its slope.',
    where: 'Level 7',
  },
  {
    id: 'gradient-descent',
    term: 'Gradient descent',
    plain:
      'Nudging every weight a small step downhill on the loss, over and over. Training is nothing more than this, done many times.',
    where: 'Level 7',
  },
  {
    id: 'hidden-layer',
    term: 'Hidden layer',
    plain:
      'A layer of neurons between the inputs and the output. Each one draws a line, and the next layer combines those lines into shapes.',
    where: 'Levels 4 and 5',
  },
  {
    id: 'input',
    term: 'Input',
    plain: 'A number fed into the network from outside: a point’s coordinates, or a 0 or a 1 in a truth table.',
    where: 'Level 1',
  },
  {
    id: 'layer',
    term: 'Layer',
    plain: 'A row of neurons that all take their inputs from the row before and all pass their answers to the row after.',
    where: 'Level 4',
  },
  {
    id: 'learning-rate',
    term: 'Learning rate',
    plain:
      'How big a step training takes each time. Too small and it crawls; too big and it overshoots the bottom and bounces.',
    where: 'Level 7',
  },
  {
    id: 'loss',
    term: 'Loss',
    plain: 'One number for how wrong the network is across all the data. Training tries to make it smaller.',
    where: 'Level 7',
  },
  {
    id: 'neuron',
    term: 'Neuron',
    plain:
      'The unit a network is built from. It multiplies each input by a weight, adds them up with a bias, and squashes the total into a single answer.',
    where: 'Level 1',
  },
  {
    id: 'relu',
    term: 'ReLU',
    plain:
      'A squash that ignores everything below zero and passes the rest through unchanged. It never levels off on the positive side, which is a big part of why it is the usual default in large networks.',
    where: 'Level 6',
  },
  {
    id: 'sigmoid',
    term: 'Sigmoid',
    plain: 'A soft switch. It squashes any sum into 0 to 1, changing fastest around zero and flattening out at both ends.',
    where: 'Levels 1 and 6',
  },
  {
    id: 'squash',
    term: 'Squash',
    plain:
      'An informal name for an activation function: it flattens any sum into a tidy range. Without one, a stack of layers is just one layer in disguise.',
    where: 'Levels 1 and 6',
  },
  {
    id: 'step',
    term: 'Step function',
    plain:
      'A squash that is 0 below zero and 1 at or above it: all or nothing. Its slope is zero everywhere, so a network built on it cannot be trained.',
    where: 'Level 6',
  },
  {
    id: 'tanh',
    term: 'Tanh',
    plain: 'Like sigmoid, but centred on zero, so it runs from −1 to 1 and can give a negative answer.',
    where: 'Level 6',
  },
  {
    id: 'threshold',
    term: 'Threshold',
    plain:
      'The total a neuron’s weighted inputs have to beat before it fires. In these neurons it is the bias with its sign flipped, which is where this site gets its name.',
    where: 'Level 1',
  },
  {
    id: 'weight',
    term: 'Weight',
    plain:
      'How much one input counts towards a neuron’s sum, and in which direction. Positive pushes towards firing, negative pushes away, and a bigger number pushes harder.',
    where: 'Level 1',
  },
];
