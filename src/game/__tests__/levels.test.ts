import { describe, expect, it } from 'vitest';
import { levels } from '../registry';
import { evaluate, confidenceOf, pipsFor, THRESHOLD } from '../evaluate';
import { createNetwork, predict, shapeOf } from '../../nn/network';
import { XOR } from '../../nn/datasets';

describe('every level ships solvable', () => {
  for (const level of levels) {
    level.stages.forEach((stage, index) => {
      it(`level ${level.id} (${stage.key}) is passed by its own known solution`, { timeout: 30000 }, () => {
        const net = level.solution(index);
        const result = evaluate(net, stage.dataset, {
          requiredAccuracy: stage.requiredAccuracy,
        });
        expect(result.solved, result.message).toBe(true);
        // A published answer should be a confident one, not a squeaker.
        expect(result.pips).toBe(3);
      });

      it(`level ${level.id} (${stage.key}) is not passed by an untouched network`, () => {
        const result = evaluate(level.makeNetwork(), stage.dataset, {
          requiredAccuracy: stage.requiredAccuracy,
        });
        expect(result.solved).toBe(false);
        expect(result.pips).toBe(0);
      });

      it(`level ${level.id} (${stage.key}) explains what is wrong, not just that it is`, () => {
        const result = evaluate(level.makeNetwork(), stage.dataset, {
          requiredAccuracy: stage.requiredAccuracy,
        });
        expect(result.message.length).toBeGreaterThan(20);
        expect(result.message.toLowerCase()).not.toBe('incorrect');
        expect(result.message).toMatch(/\d/);
      });
    });

    it(`level ${level.id} has copy for every stage`, () => {
      expect(level.stages.length).toBeGreaterThan(0);
      for (const stage of level.stages) {
        expect(stage.goal.length).toBeGreaterThan(8);
        expect(stage.intro.length).toBeGreaterThan(40);
        expect(stage.hint.length).toBeGreaterThan(20);
        expect(stage.learned.length).toBeGreaterThan(30);
      }
    });

    it(`level ${level.id} starts with a network the dataset fits`, () => {
      const net = level.makeNetwork();
      const inputs = level.stages[0].dataset.points[0].x;
      expect(net.inputSize).toBe(inputs.length);
      expect(() => predict(net, inputs)).not.toThrow();
    });
  }

  it('gives the levels consecutive ids starting at 1', () => {
    expect(levels.map((l) => l.id)).toEqual(levels.map((_, i) => i + 1));
  });
});

describe('level 4 is the wall it claims to be', () => {
  it('no single neuron can pass it, however it is set', () => {
    // A broad sweep of single-neuron settings: if any of them solved XOR the
    // level's whole argument would be wrong.
    let best = 0;
    for (let w1 = -10; w1 <= 10; w1 += 0.5) {
      for (let w2 = -10; w2 <= 10; w2 += 0.5) {
        for (let b = -10; b <= 10; b += 0.5) {
          const correct = XOR.points.filter((p) => {
            const z = w1 * p.x[0] + w2 * p.x[1] + b;
            const out = z >= 0 ? 1 : 0;
            return out === p.y[0];
          }).length;
          best = Math.max(best, correct);
        }
      }
    }
    expect(best).toBe(3);
  });

  it('the escape hatch hands over a network that can do it', () => {
    const level = levels.find((l) => l.id === 4)!;
    expect(level.escape).toBeDefined();
    const opened = level.escape!.apply(level.makeNetwork());
    expect(shapeOf(opened)).toEqual([2, 2, 1]);
    expect(shapeOf(level.solution())).toEqual([2, 2, 1]);
  });
});

describe('scoring', () => {
  it('awards pips on distance from the threshold', () => {
    expect(pipsFor(0.49)).toBe(3);
    expect(pipsFor(0.4)).toBe(3);
    expect(pipsFor(0.3)).toBe(2);
    expect(pipsFor(0.1)).toBe(1);
    expect(pipsFor(0)).toBe(0);
  });

  it('scores a few rows on the weakest one and many points on the weakest tenth', () => {
    expect(confidenceOf([0.4, 0.1, 0.45])).toBe(0.1);
    const many = Array.from({ length: 100 }, (_, i) => (i < 5 ? 0.01 : 0.45));
    expect(confidenceOf(many)).toBe(0.45);
  });

  it('never gives confidence to an unsolved attempt', () => {
    const level = levels[0];
    const result = evaluate(createNetwork([2, 1]), level.stages[0].dataset);
    expect(result.confidence).toBe(0);
    expect(result.pips).toBe(0);
  });

  it('treats a row exactly on the threshold as fired, consistently', () => {
    const result = evaluate(createNetwork([2, 1]), level1Dataset());
    // Every output is exactly 0.5 with a zeroed network.
    expect(result.rows.every((r) => r.output === THRESHOLD)).toBe(true);
  });
});

function level1Dataset() {
  return levels[0].stages[0].dataset;
}
