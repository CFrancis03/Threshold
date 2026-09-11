import type { Dataset } from '../nn/datasets';
import type { ActivationName, Network } from '../nn/types';

/** How the puzzle is presented: a truth table, a heatmap, or a training run. */
export type LevelView = 'truthTable' | 'boundary' | 'boundaryWithHidden' | 'train';

export interface CheckRow {
  input: number[];
  output: number;
  target: number;
  ok: boolean;
  /** How far this answer sits from the threshold. Bigger is more confident. */
  margin: number;
}

export interface WinResult {
  solved: boolean;
  rows: CheckRow[];
  correct: number;
  total: number;
  /** The confidence the pips are awarded on. */
  confidence: number;
  pips: 0 | 1 | 2 | 3;
  /** What to say to the player right now — never just "incorrect". */
  message: string;
}

/**
 * Most levels are one puzzle. Level 2 is two (OR, then NAND) on the same
 * neuron, which is the point it is making, so a level is a list of stages.
 */
export interface LevelStage {
  key: string;
  /** The instruction, e.g. "Make this neuron behave like OR". */
  goal: string;
  intro: string;
  hint: string;
  learned: string;
  dataset: Dataset;
  /** Fraction of points that must land on the right side. Default 1. */
  requiredAccuracy?: number;
  /** Start this stage from a fresh network rather than carrying the last one. */
  resetNetwork?: boolean;
}

export interface LevelAffordances {
  weights: boolean;
  biases: boolean;
  /** Show the activation picker. */
  activation: boolean;
  /** Show the Train button. */
  train: boolean;
}

/** The hidden layer that level 4 hands over once the player has met the wall. */
export interface Escape {
  /** Failed checks before the offer appears on its own. */
  afterAttempts: number;
  label: string;
  note: string;
  apply: (net: Network) => Network;
}

export interface LevelDef {
  id: number;
  title: string;
  /** One line under the number, e.g. "One neuron, one job". */
  subtitle: string;
  stages: LevelStage[];
  view: LevelView;
  allow: LevelAffordances;
  makeNetwork: () => Network;
  /** Layers the player may not edit — level 6 locks the hidden layer. */
  lockedLayers?: number[];
  inputLabels?: string[];
  outputLabels?: string[];
  /** Activations offered when `allow.activation` is on. */
  activationChoices?: ActivationName[];
  escape?: Escape;
  /**
   * A network known to pass the given stage. The tests run every one of these
   * through the real win condition, so a level can never ship unsolvable.
   */
  solution: (stageIndex?: number) => Network;
  /** Extra requirement beyond the dataset, returning a reason it is not met. */
  blocker?: (net: Network) => string | null;
  /** Suggested starting learning rate for level 7. */
  learningRate?: number;
}
