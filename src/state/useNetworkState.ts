import { useCallback, useRef, useState } from 'react';
import type { Network, ParamRef } from '../nn/types';

/**
 * The editing state shared by the levels, the sandbox and the landing page:
 * a network, the input vector currently running through it, whatever is
 * selected, and a counter that replays the signal pulse.
 */
export function useNetworkState(initial: Network, initialInputs: number[]) {
  const [net, setNet] = useState<Network>(initial);
  const [inputs, setRawInputs] = useState<number[]>(initialInputs);
  const [selected, setSelected] = useState<ParamRef | null>(null);
  const [pulse, setPulse] = useState(0);
  const initialRef = useRef(initial);

  const setInputs = useCallback((next: number[]) => {
    setRawInputs(next);
    // A new input is a new signal, so send one down the wires.
    setPulse((p) => p + 1);
  }, []);

  const toggleInput = useCallback((index: number) => {
    setRawInputs((prev) => prev.map((v, i) => (i === index ? (v > 0.5 ? 0 : 1) : v)));
    setPulse((p) => p + 1);
  }, []);

  const reset = useCallback(() => {
    setNet(initialRef.current);
    setSelected(null);
    setPulse((p) => p + 1);
  }, []);

  /** Replace the starting point, e.g. when a level unlocks a hidden layer. */
  const replace = useCallback((next: Network, keepAsInitial = false) => {
    setNet(next);
    if (keepAsInitial) initialRef.current = next;
    setSelected(null);
    setPulse((p) => p + 1);
  }, []);

  return {
    net,
    setNet,
    inputs,
    setInputs,
    toggleInput,
    selected,
    setSelected,
    pulse,
    reset,
    replace,
  };
}
