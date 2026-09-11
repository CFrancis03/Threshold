import { useCallback, useEffect, useRef, useState } from 'react';
import { initTrainState, isTrainable, trainStep, type TrainState } from '../nn/train';
import type { LossName } from '../nn/loss';
import type { Network, Sample } from '../nn/types';

export interface TrainerOptions {
  data: Sample[];
  learningRate: number;
  loss?: LossName;
  momentum?: number;
  /** Called every frame with the updated network. */
  onNet: (net: Network) => void;
}

/**
 * Runs gradient descent inside an animation frame loop.
 *
 * The player is meant to *watch* this, so we render after every batch of
 * steps rather than training to completion and showing the answer. How many
 * steps fit in a frame depends on the machine and the network, so we measure
 * and adapt instead of guessing a number.
 */
export function useTrainer(net: Network, { data, learningRate, loss = 'bce', momentum = 0.9, onNet }: TrainerOptions) {
  const [running, setRunning] = useState(false);
  const [train, setTrain] = useState<TrainState | null>(null);

  const frame = useRef(0);
  const stepsPerFrame = useRef(4);
  const stateRef = useRef<TrainState | null>(null);
  const opts = useRef({ learningRate, loss, momentum, data, onNet });
  opts.current = { learningRate, loss, momentum, data, onNet };

  const trainable = isTrainable(net);

  const stop = useCallback(() => {
    setRunning(false);
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = 0;
  }, []);

  const reset = useCallback(() => {
    stop();
    stateRef.current = null;
    setTrain(null);
  }, [stop]);

  const start = useCallback(
    (from: Network) => {
      if (!isTrainable(from)) return;
      // Pick up from wherever the network is now, including any hand edits.
      stateRef.current = initTrainState(from, opts.current.data, opts.current.loss);
      setTrain(stateRef.current);
      setRunning(true);
    },
    [],
  );

  useEffect(() => {
    if (!running) return;

    const tick = () => {
      const current = stateRef.current;
      if (!current) return;
      const { learningRate: lr, loss: lossName, momentum: m, data: samples, onNet: push } = opts.current;

      const started = performance.now();
      let next = current;
      for (let i = 0; i < stepsPerFrame.current; i++) {
        next = trainStep(next, samples, { learningRate: lr, loss: lossName, momentum: m });
      }
      const elapsed = performance.now() - started;

      // Aim for about 7ms of work per frame, leaving the rest for painting.
      const perStep = elapsed / stepsPerFrame.current;
      stepsPerFrame.current = Math.max(1, Math.min(60, Math.round(7 / Math.max(perStep, 0.05))));

      stateRef.current = next;
      setTrain(next);
      push(next.net);
      frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = 0;
    };
  }, [running]);

  // Never leave a loop running behind us.
  useEffect(() => stop, [stop]);

  return {
    running,
    trainable,
    state: train,
    stepsPerFrame: stepsPerFrame.current,
    start,
    stop,
    reset,
    toggle: (from: Network) => (running ? stop() : start(from)),
  };
}
