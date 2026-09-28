// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { FourDemands } from '../FourDemands';
import { HiddenSpace } from '../HiddenSpace';
import { Toggle } from '../ui/Controls';
import { createNetwork, getBias, getWeight, setBias, setWeight } from '../../nn/network';
import { XOR } from '../../nn/datasets';
import { level4 } from '../../game/levels/level4';

function neuron(w1: number, w2: number, b: number) {
  let net = createNetwork([2, 1]);
  net = setWeight(net, 0, 0, 0, w1);
  net = setWeight(net, 0, 0, 1, w2);
  return setBias(net, 0, 0, b);
}

describe('<FourDemands>', () => {
  it('writes each corner out as a formula with its live value', () => {
    render(<FourDemands net={neuron(1.5, -0.75, 0.25)} onChange={() => {}} />);
    const rows = screen.getAllByRole('row').slice(1); // drop the header
    expect(rows).toHaveLength(4);
    const cells = rows.map((r) => within(r).getAllByRole('cell').map((c) => c.textContent));
    expect(cells[0].slice(0, 4)).toEqual(['(0, 0)', 'b', '+0.25', 'below 0']);
    expect(cells[1].slice(1, 4)).toEqual(['w₂ + b', '−0.50', 'above 0']);
    expect(cells[2].slice(1, 4)).toEqual(['w₁ + b', '+1.75', 'above 0']);
    expect(cells[3].slice(1, 4)).toEqual(['w₁ + w₂ + b', '+1.00', 'below 0']);
    // Only (1,0) is right: z is positive and it wanted positive. The others have
    // the wrong sign for what XOR asks there.
    expect(cells.map((c) => c[4])).toEqual(['✗', '✗', '✓', '✗']);
  });

  it('marks a corner the neuron gets wrong, in words as well as with a glyph', () => {
    render(<FourDemands net={neuron(1.5, -0.75, 0.25)} onChange={() => {}} />);
    // (0,1) needs above 0 but z is -0.50, and (1,1) needs below 0 but z is +1.00.
    expect(screen.getAllByLabelText('not satisfied').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByLabelText('satisfied').length).toBeGreaterThanOrEqual(1);
  });

  it('shows the very same number for both pair sums, for whatever the weights are', () => {
    for (const [w1, w2, b] of [[1.5, -0.75, 0.25], [-6, 3.5, 2], [0, 0, 0], [7.9, 7.9, -8]]) {
      const { unmount } = render(<FourDemands net={neuron(w1, w2, b)} onChange={() => {}} />);
      const values = Array.from(document.querySelectorAll('[class*="pairValue"]')).map((e) => e.textContent);
      expect(values).toHaveLength(2);
      expect(values[0]).toBe(values[1]);
      unmount();
    }
  });

  it('always fails exactly one of the two pair requirements', () => {
    // One sum, two opposite demands: one of them has to be unmet.
    for (const [w1, w2, b] of [[1.5, -0.75, 0.25], [-6, 3.5, 2], [4, 4, -3], [-2, -2, 3]]) {
      const { unmount } = render(<FourDemands net={neuron(w1, w2, b)} onChange={() => {}} />);
      const pairs = document.querySelectorAll('[class*="pair"][class*="pairNeeds"], [class*="pairNeeds"]');
      const marks = Array.from(pairs).map((p) => p.querySelector('[aria-label]')?.getAttribute('aria-label'));
      expect(marks.filter((m) => m === 'not satisfied')).toHaveLength(1);
      expect(marks.filter((m) => m === 'satisfied')).toHaveLength(1);
      unmount();
    }
  });

  it('edits the real network when a slider moves', () => {
    const onChange = vi.fn();
    render(<FourDemands net={neuron(1, 1, 0)} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('w₁'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('w₂'), { target: { value: '-2' } });
    fireEvent.change(screen.getByLabelText('b'), { target: { value: '1.5' } });

    const [first, second, third] = onChange.mock.calls.map((c) => c[0]);
    expect(getWeight(first, 0, 0, 0)).toBe(3);
    expect(getWeight(second, 0, 0, 1)).toBe(-2);
    expect(getBias(third, 0, 0)).toBe(1.5);
  });

  it('steps aside once there is a hidden layer to do the job', () => {
    const { container } = render(<FourDemands net={level4.solution()} onChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('<HiddenSpace>', () => {
  it('appears only when the last hidden layer has two neurons', () => {
    const none = render(<HiddenSpace net={createNetwork([2, 1])} dataset={XOR} />);
    expect(none.container).toBeEmptyDOMElement();
    none.unmount();

    const three = render(<HiddenSpace net={createNetwork([2, 3, 1])} dataset={XOR} />);
    expect(three.container).toBeEmptyDOMElement();
    three.unmount();

    render(<HiddenSpace net={createNetwork([2, 2, 1], { seed: 19 })} dataset={XOR} />);
    expect(screen.getByText('Hidden space')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Hidden space/ })).toBeInTheDocument();
  });

  it('points out two inputs landing on the same spot, once they do', () => {
    const { unmount } = render(<HiddenSpace net={createNetwork([2, 2, 1], { seed: 19 })} dataset={XOR} />);
    expect(screen.queryByText(/Count the marks/)).toBeNull();
    unmount();

    render(<HiddenSpace net={level4.solution()} dataset={XOR} />);
    expect(screen.getByText(/Count the marks/)).toBeInTheDocument();
  });
});

describe('<Toggle>', () => {
  it('is a real checkbox with the label as its name', () => {
    const onChange = vi.fn();
    render(<Toggle label="Show which way the weights point" checked={false} onChange={onChange} />);
    const box = screen.getByRole('checkbox', { name: 'Show which way the weights point' });
    expect(box).not.toBeChecked();
    fireEvent.click(box);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('reflects being on', () => {
    render(<Toggle label="Arrow" checked onChange={() => {}} />);
    expect(screen.getByRole('checkbox', { name: 'Arrow' })).toBeChecked();
  });
});

/* ------------------------------------------------------------------ */

import { act } from '@testing-library/react';
import { GradientDescent1D } from '../GradientDescent1D';
import { CollapseDemo } from '../CollapseDemo';

/** The number under a readout heading, e.g. readout('slope'). */
function readout(name: string): string {
  const dt = screen.getByText(name, { selector: 'dt' });
  return dt.parentElement!.querySelector('dd')!.textContent!;
}

const setSlider = (label: string, value: number) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value: String(value) } });

describe('<GradientDescent1D>', () => {
  it('starts the ball on the left wall of the bowl, with the slope pointing downhill', () => {
    render(<GradientDescent1D />);
    expect(readout('weight')).toBe('−0.60');
    expect(readout('loss')).toBe('6.76');
    expect(readout('slope')).toBe('−5.20');
    expect(readout('steps')).toBe('0');
  });

  it('a step moves the weight against the slope by learning rate times its size', () => {
    render(<GradientDescent1D />);
    // Default rate 0.3: -0.6 - 0.3 × (-5.2) = 0.96.
    fireEvent.click(screen.getByRole('button', { name: 'Take a step' }));
    expect(readout('weight')).toBe('0.96');
    expect(readout('steps')).toBe('1');
    expect(readout('slope')).toBe('−2.08');
  });

  it('agrees with itself: the slope it measures is the slope calculus gives', () => {
    render(<GradientDescent1D />);
    expect(screen.getByText(/Calculus gives −5\.20, and the two agree/)).toBeInTheDocument();
  });

  it('at exactly half the slope, one step lands on the bottom and it says so', () => {
    render(<GradientDescent1D />);
    setSlider('Learning rate', 0.5);
    expect(screen.getByRole('status')).toHaveTextContent(/Exactly half/);
    fireEvent.click(screen.getByRole('button', { name: 'Take a step' }));
    expect(readout('weight')).toBe('2.00');
    expect(screen.getByRole('status')).toHaveTextContent(/Settled at the bottom/);
    // Nowhere further downhill, so there is nothing left to press.
    expect(screen.getByRole('button', { name: 'Take a step' })).toBeDisabled();
  });

  it('describes each regime as you drag the rate through them', () => {
    render(<GradientDescent1D />);
    const says = (rate: number, pattern: RegExp) => {
      setSlider('Learning rate', rate);
      expect(screen.getByRole('status')).toHaveTextContent(pattern);
    };
    says(0.04, /Too small/);
    says(0.25, /About right/);
    says(0.8, /Getting big/);
    says(1.1, /Too big/);
  });

  it('flies off the chart at a high rate, and says what that means', () => {
    render(<GradientDescent1D />);
    setSlider('Learning rate', 1.2);
    const step = screen.getByRole('button', { name: 'Take a step' });
    for (let i = 0; i < 12 && !step.hasAttribute('disabled'); i++) fireEvent.click(step);
    expect(screen.getByRole('status')).toHaveTextContent(/flown off the chart/);
    expect(readout('weight')).toBe('—');
    expect(step).toBeDisabled();
  });

  it('starts again from the same place', () => {
    render(<GradientDescent1D />);
    fireEvent.click(screen.getByRole('button', { name: 'Take a step' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start again' }));
    expect(readout('steps')).toBe('0');
    expect(readout('slope')).toBe('−5.20');
  });

  it('lets you drop the ball somewhere else', () => {
    render(<GradientDescent1D />);
    setSlider('Start the ball at weight', 4);
    expect(readout('weight')).toBe('4.00');
    expect(readout('slope')).toBe('+4.00');
  });

  it('keeps going by itself, one step at a time, and can be paused', () => {
    vi.useFakeTimers();
    try {
      render(<GradientDescent1D />);
      fireEvent.click(screen.getByRole('button', { name: 'Keep going' }));
      act(() => {
        vi.advanceTimersByTime(400 * 3);
      });
      expect(readout('steps')).toBe('3');

      fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
      act(() => {
        vi.advanceTimersByTime(400 * 5);
      });
      expect(readout('steps')).toBe('3');
    } finally {
      vi.useRealTimers();
    }
  });

  it('stops on its own once it has settled', () => {
    vi.useFakeTimers();
    try {
      render(<GradientDescent1D />);
      setSlider('Learning rate', 0.5);
      fireEvent.click(screen.getByRole('button', { name: 'Keep going' }));
      // One tick at a time, as in life: React renders (and notices the ball has
      // settled) between one tick and the next. Six ticks inside a single act
      // would give it no chance to.
      for (let tick = 0; tick < 6; tick++) {
        act(() => {
          vi.advanceTimersByTime(400);
        });
      }
      // One step to land, then it notices there is nowhere left to go.
      expect(readout('steps')).toBe('1');
      expect(screen.getByRole('button', { name: 'Keep going' })).toBeDisabled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('draws a chart a screen reader can get the state from', () => {
    render(<GradientDescent1D />);
    const chart = screen.getByRole('img', { name: /bowl-shaped loss curve/ });
    // Negatives are spoken as "minus", not left as a dash for the reader to guess at.
    expect(chart).toHaveAccessibleName(/ball is at weight minus 0\.60/);
    expect(chart).toHaveAccessibleName(/slope is minus 5\.20/);
    expect(chart).toHaveAccessibleName(/next step would take it to 0\.96/);
  });
});

describe('<CollapseDemo>', () => {
  it('shows the single neuron the three hidden ones multiply out to', () => {
    render(<CollapseDemo />);
    expect(screen.getByText(/weights \(\+10\.00, −7\.50\), bias \+1\.42/)).toBeInTheDocument();
    expect(screen.getByText('One neuron')).toBeInTheDocument();
    expect(screen.getAllByRole('img')).toHaveLength(2);
  });

  it('has nothing true to show as a single neuron once a squash is in the way', () => {
    render(<CollapseDemo />);
    fireEvent.click(screen.getByRole('radio', { name: 'tanh' }));
    expect(screen.queryByText(/weights \(/)).toBeNull();
    expect(screen.getByText(/The squash gets in the way/)).toBeInTheDocument();
    expect(screen.getAllByRole('img')).toHaveLength(1);
  });
});

import { LossCurve } from '../LossCurve';

describe('the drawing of the bowl', () => {
  /** Twice the area of the triangle: zero exactly when three points are in a line. */
  const cross = (a: [number, number], b: [number, number], c: [number, number]) =>
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

  it.each([-0.95, -0.6, 0.4, 2, 3.3, 4.9])(
    'draws a tangent that passes through the ball, even close to the edge of the chart (weight %s)',
    (start) => {
      const { container, unmount } = render(<GradientDescent1D />);
      setSlider('Start the ball at weight', start);
      // At the very bottom the slope is zero and a flat line is the tangent.
      const ball = container.querySelector('circle[class*="ball"]')!;
      const line = container.querySelector('line[class*="tangent"]')!;
      const num = (el: Element, name: string) => Number(el.getAttribute(name));
      const centre: [number, number] = [num(ball, 'cx'), num(ball, 'cy')];
      const a: [number, number] = [num(line, 'x1'), num(line, 'y1')];
      const b: [number, number] = [num(line, 'x2'), num(line, 'y2')];
      // Collinear, to within a fraction of a pixel of error.
      const lengthOfLine = Math.hypot(b[0] - a[0], b[1] - a[1]);
      expect(Math.abs(cross(a, b, centre)) / lengthOfLine).toBeLessThan(0.5);
      unmount();
    },
  );

  it('colours the tangent by which way the ground slopes, like every other signed thing here', () => {
    const { container } = render(<GradientDescent1D />);
    setSlider('Start the ball at weight', 0);
    expect(container.querySelector('line[class*="tangentNeg"]')).not.toBeNull();
    setSlider('Start the ball at weight', 4);
    expect(container.querySelector('line[class*="tangentPos"]')).not.toBeNull();
  });
});

describe('<LossCurve>', () => {
  it('keeps its empty-state words out of the stretched drawing, where they would be distorted', () => {
    render(<LossCurve history={[]} step={0} accuracy={null} />);
    const note = screen.getByText('Press Train network to start.');
    expect(note.closest('svg')).toBeNull();
  });

  it('drops the note once there is a curve to look at', () => {
    render(<LossCurve history={[1, 0.8, 0.6, 0.5]} step={3} accuracy={0.5} />);
    expect(screen.queryByText('Press Train network to start.')).toBeNull();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('shows dashes rather than misleading zeros before a run has started', () => {
    render(<LossCurve history={[]} step={0} accuracy={null} />);
    expect(screen.getAllByText('—')).toHaveLength(3);
  });
});
