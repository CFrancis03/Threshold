/**
 * The five things the site says a visitor should be able to explain by the end.
 *
 * Each is asked first and answered second, because being made to produce an
 * explanation, even a clumsy one, teaches far more than reading a good one.
 */

export interface Question {
  id: string;
  prompt: string;
  answer: string;
}

export const selfCheck: Question[] = [
  {
    id: 'weight',
    prompt: 'What does a weight do?',
    answer:
      'A weight is how much one input counts towards the neuron’s total, and in which direction. A positive weight pushes towards firing, a negative one pushes away, and a bigger number pushes harder.',
  },
  {
    id: 'bias',
    prompt: 'What does the bias do?',
    answer:
      'The bias is a number added to the total whatever the inputs are. It sets how much evidence the neuron needs before it fires. It is the threshold with its sign flipped, so raising it makes the neuron easier to set off.',
  },
  {
    id: 'activation',
    prompt: 'What does an activation function do?',
    answer:
      'It squashes the neuron’s total into a tidy range, so the answer can be passed on. More importantly, it is what lets layers add up to more than one straight line. With no squash, a network of any depth is just a single neuron in disguise.',
  },
  {
    id: 'xor',
    prompt: 'Why can’t one neuron do XOR?',
    answer:
      'One neuron draws a single straight line through its inputs, and no straight line can put (0, 0) and (1, 1) on one side and (0, 1) and (1, 0) on the other. Two hidden neurons fix it, not by making the last neuron cleverer, but by moving the points to where one line is enough.',
  },
  {
    id: 'training',
    prompt: 'What is training?',
    answer:
      'Measure how wrong the network is, work out for each weight which nudge would make it less wrong, and take a small step that way. Then repeat, many times. Backpropagation is the quick way to work out all of those nudges at once.',
  },
];
