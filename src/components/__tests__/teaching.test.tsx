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
