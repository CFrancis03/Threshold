import type { Network, ParamRef } from '../../nn/types';
import type { NodeGeom } from './layout';

/**
 * Human names for every part of the diagram.
 *
 * These strings are read aloud by screen readers and printed in the inspector,
 * so they need to be the same words a person would use out loud.
 */

export interface NameOptions {
  inputLabels?: string[];
  outputLabels?: string[];
}

export function nodeName(node: NodeGeom, columns: number, opts: NameOptions = {}): string {
  void columns;
  if (node.kind === 'input') return opts.inputLabels?.[node.index] ?? `input ${node.index + 1}`;
  if (node.kind === 'output') return opts.outputLabels?.[node.index] ?? 'output';
  return `hidden ${node.index + 1}`;
}

/** Name a node by its column/index without needing the geometry. */
export function nameFor(
  net: Network,
  column: number,
  index: number,
  opts: NameOptions = {},
): string {
  const columns = net.layers.length + 1;
  if (column === 0) return opts.inputLabels?.[index] ?? `input ${index + 1}`;
  if (column === columns - 1) {
    const custom = opts.outputLabels?.[index];
    if (custom) return custom;
    // Numbering a lone output neuron just adds a digit nobody needs.
    const outputs = net.layers[net.layers.length - 1].biases.length;
    return outputs === 1 ? 'output' : `output ${index + 1}`;
  }
  return `hidden ${index + 1}`;
}

export function describeParam(net: Network, ref: ParamRef, opts: NameOptions = {}): string {
  if (ref.kind === 'bias') {
    return `Bias of ${nameFor(net, ref.layer + 1, ref.to, opts)}`;
  }
  return `Weight from ${nameFor(net, ref.layer, ref.from, opts)} to ${nameFor(net, ref.layer + 1, ref.to, opts)}`;
}

export function sameParam(a: ParamRef | null | undefined, b: ParamRef | null | undefined): boolean {
  if (!a || !b || a.kind !== b.kind) return false;
  if (a.kind === 'bias' && b.kind === 'bias') return a.layer === b.layer && a.to === b.to;
  if (a.kind === 'weight' && b.kind === 'weight') {
    return a.layer === b.layer && a.to === b.to && a.from === b.from;
  }
  return false;
}
