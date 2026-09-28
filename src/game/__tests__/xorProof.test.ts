import { describe, expect, it } from 'vitest';
import { analyseXor, isSingleNeuron } from '../xorProof';
import { createNetwork, setBias, setWeight } from '../../nn/network';
import { makeRng } from '../../nn/rng';
import { level4 } from '../levels/level4';

/** A single neuron with weights and bias drawn from a seeded generator. */
function randomNeuron(seed: number, spread = 12) {
  const rng = makeRng(seed);
  const pick = () => (rng() - 0.5) * spread;
  let net = createNetwork([2, 1]);
  net = setWeight(net, 0, 0, 0, pick());
  net = setWeight(net, 0, 0, 1, pick());
  net = setBias(net, 0, 0, pick());
  return net;
}

describe('the XOR argument', () => {
  it('writes z out the way the panel says it does', () => {
    let net = createNetwork([2, 1]);
    net = setWeight(net, 0, 0, 0, 1.5); // w1
    net = setWeight(net, 0, 0, 1, -0.75); // w2
    net = setBias(net, 0, 0, 0.25); // b
    const a = analyseXor(net)!;
    const z = Object.fromEntries(a.demands.map((d) => [d.input.join(','), d.z]));
    expect(z['0,0']).toBeCloseTo(0.25, 12); // b
    expect(z['0,1']).toBeCloseTo(-0.5, 12); // w2 + b
    expect(z['1,0']).toBeCloseTo(1.75, 12); // w1 + b
    expect(z['1,1']).toBeCloseTo(1.0, 12); // w1 + w2 + b
  });

  it('gives two pair-sums that are EXACTLY the same number, for any weights at all', () => {
    // This is the whole proof. If it ever failed, the level's claim would be
    // wrong, so it is checked across a lot of very different neurons.
    for (let seed = 1; seed <= 400; seed++) {
      const a = analyseXor(randomNeuron(seed, seed % 2 ? 4 : 40))!;
      expect(a.mustBePositive).toBeCloseTo(a.mustBeNegative, 9);
    }
  });

  it('the pair sums equal w1 + w2 + 2b, as the algebra on the page says', () => {
    const net = randomNeuron(7);
    const [w1, w2] = net.layers[0].weights[0];
    const b = net.layers[0].biases[0];
    const a = analyseXor(net)!;
    expect(a.mustBePositive).toBeCloseTo(w1 + w2 + 2 * b, 9);
    expect(a.mustBeNegative).toBeCloseTo(w1 + w2 + 2 * b, 9);
  });

  it('so no setting of one neuron ever satisfies all four demands', () => {
    let best = 0;
    for (let seed = 1; seed <= 3000; seed++) {
      best = Math.max(best, analyseXor(randomNeuron(seed, 30))!.correct);
    }
    expect(best).toBe(3);
  });

  it('agrees with what the truth table shows: correct counts the real output', () => {
    // A neuron leaning on (1,1) only: fires there, and nowhere else.
    let net = createNetwork([2, 1]);
    net = setWeight(net, 0, 0, 0, 5);
    net = setWeight(net, 0, 0, 1, 5);
    net = setBias(net, 0, 0, -8);
    const a = analyseXor(net)!;
    // Off at (0,0) is right for XOR; off at (0,1) and (1,0) is wrong; on at
    // (1,1) is wrong too.
    expect(a.demands.map((d) => d.ok)).toEqual([true, false, false, false]);
    expect(a.correct).toBe(1);
  });

  it('marks which corners want the neuron on', () => {
    const a = analyseXor(createNetwork([2, 1]))!;
    expect(a.demands.map((d) => d.wantsOn)).toEqual([false, true, true, false]);
  });

  it('only applies to a single neuron, and steps aside once a hidden layer arrives', () => {
    expect(isSingleNeuron(createNetwork([2, 1]))).toBe(true);
    expect(isSingleNeuron(createNetwork([2, 2, 1]))).toBe(false);
    expect(isSingleNeuron(createNetwork([3, 1]))).toBe(false);
    expect(analyseXor(createNetwork([2, 2, 1]))).toBeNull();
    expect(analyseXor(level4.solution())).toBeNull();
  });
});
