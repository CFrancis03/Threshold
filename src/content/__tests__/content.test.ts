import { describe, expect, it } from 'vitest';
import { glossary } from '../glossary';
import { selfCheck } from '../selfCheck';

describe('the glossary', () => {
  it('is in alphabetical order, so a word can be found without knowing where it is filed', () => {
    const names = glossary.map((t) => t.term.toLowerCase());
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it('gives every term a unique, url-safe id', () => {
    const ids = glossary.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z]+(-[a-z]+)*$/);
  });

  it('defines every term in a sentence or two, and says where you meet it', () => {
    for (const t of glossary) {
      expect(t.plain.length, t.term).toBeGreaterThan(30);
      expect(t.plain.length, t.term).toBeLessThan(260);
      expect(t.plain.endsWith('.'), t.term).toBe(true);
      expect(t.where, t.term).toMatch(/^Levels? \d/);
    }
  });

  it('does not define a word using itself alone', () => {
    for (const t of glossary) {
      expect(t.plain.toLowerCase().startsWith(`${t.term.toLowerCase()} is`), t.term).toBe(false);
    }
  });

  it('covers every idea the site says a visitor should leave able to explain', () => {
    const have = new Set(glossary.map((t) => t.id));
    for (const needed of ['weight', 'bias', 'activation', 'threshold', 'hidden-layer', 'loss', 'gradient-descent', 'learning-rate', 'backpropagation']) {
      expect(have.has(needed), needed).toBe(true);
    }
  });

  it('points only at levels that exist', () => {
    for (const t of glossary) {
      for (const n of t.where.match(/\d+/g) ?? []) {
        expect(Number(n)).toBeGreaterThanOrEqual(1);
        expect(Number(n)).toBeLessThanOrEqual(7);
      }
    }
  });
});

describe('the self-check', () => {
  it('asks exactly the five questions the site promises a visitor can answer', () => {
    expect(selfCheck.map((q) => q.id)).toEqual(['weight', 'bias', 'activation', 'xor', 'training']);
  });

  it('asks a question and answers it in full sentences', () => {
    for (const q of selfCheck) {
      expect(q.prompt.endsWith('?'), q.id).toBe(true);
      expect(q.answer.length, q.id).toBeGreaterThan(120);
      expect(q.answer.endsWith('.'), q.id).toBe(true);
    }
  });

  it('answers the XOR question with the reason, not just the fact', () => {
    const xor = selfCheck.find((q) => q.id === 'xor')!.answer;
    expect(xor).toMatch(/straight line/);
    expect(xor).toMatch(/hidden/);
  });
});
