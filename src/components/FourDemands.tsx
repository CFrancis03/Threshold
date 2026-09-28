import css from './FourDemands.module.css';
import { Slider } from './ui/Controls';
import { analyseXor } from '../game/xorProof';
import { getBias, getWeight, setBias, setWeight } from '../nn/network';
import { signed } from '../lib/format';
import type { Network } from '../nn/types';

export interface FourDemandsProps {
  net: Network;
  onChange: (next: Network) => void;
}

const tone = (v: number) => (v >= 0 ? css.pos : css.neg);

/**
 * Why one neuron can never do XOR, as something you can push on.
 *
 * The sliders edit the very same network the diagram is showing, so dragging
 * here moves the network above too. What stays put is the thing the panel is
 * about: the two pair-sums are the same number for every setting of the three
 * sliders, and XOR needs one of them above zero and the other below.
 */
export function FourDemands({ net, onChange }: FourDemandsProps) {
  const analysis = analyseXor(net);
  if (!analysis) return null;

  const w1 = getWeight(net, 0, 0, 0);
  const w2 = getWeight(net, 0, 0, 1);
  const b = getBias(net, 0, 0);
  const { demands, mustBePositive, mustBeNegative } = analysis;

  return (
    <section className={css.panel} aria-labelledby="four-demands">
      <h2 id="four-demands" className={css.title}>
        The four demands
      </h2>

      <p className={css.lead}>
        XOR asks for four things at once. Each one is a demand about the sign of the sum <em>z</em> at
        one corner: above zero means the neuron fires, below means it stays quiet. Move the three
        numbers and see how many you can satisfy.
      </p>

      <div className={css.sliders}>
        <Slider
          label="w₁"
          value={w1}
          min={-8}
          max={8}
          step={0.05}
          hideNumber
          compact
          note={<span className="num">{signed(w1)}</span>}
          onChange={(v) => onChange(setWeight(net, 0, 0, 0, v))}
        />
        <Slider
          label="w₂"
          value={w2}
          min={-8}
          max={8}
          step={0.05}
          hideNumber
          compact
          note={<span className="num">{signed(w2)}</span>}
          onChange={(v) => onChange(setWeight(net, 0, 0, 1, v))}
        />
        <Slider
          label="b"
          value={b}
          min={-8}
          max={8}
          step={0.05}
          hideNumber
          compact
          note={<span className="num">{signed(b)}</span>}
          onChange={(v) => onChange(setBias(net, 0, 0, v))}
        />
      </div>

      <table className={css.table}>
        <caption className="sr-only">
          The sum at each corner, and whether it has the sign XOR needs there
        </caption>
        <thead>
          <tr>
            <th scope="col">corner</th>
            <th scope="col">z =</th>
            <th scope="col">right now</th>
            <th scope="col">needs</th>
            <th scope="col">
              <span className="sr-only">satisfied</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {demands.map((d) => (
            <tr key={d.input.join(',')} className={d.ok ? undefined : css.bad}>
              <td className={css.corner}>({d.input.join(', ')})</td>
              <td className={css.formula}>{d.formula}</td>
              <td className={tone(d.z)}>{signed(d.z)}</td>
              <td className={css.needs}>{d.wantsOn ? 'above 0' : 'below 0'}</td>
              <td className={css.mark}>
                <span aria-label={d.ok ? 'satisfied' : 'not satisfied'}>{d.ok ? '✓' : '✗'}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className={css.lead}>
        Now add up <em>z</em> for the two corners that need to be above zero, and for the two that need
        to be below.
      </p>

      <div className={css.pairs}>
        <Pair
          name="(0, 1) + (1, 0)"
          value={mustBePositive}
          needsPositive
        />
        <Pair
          name="(0, 0) + (1, 1)"
          value={mustBeNegative}
          needsPositive={false}
        />
      </div>

      <p className={css.verdict}>
        The very same expression, so the very same number — however you set the sliders. One number
        can’t be above zero and below zero at once, so one of those two rows always fails. That is
        the wall, and it has nothing to do with trying harder.
      </p>
    </section>
  );
}

function Pair({ name, value, needsPositive }: { name: string; value: number; needsPositive: boolean }) {
  const ok = needsPositive ? value >= 0 : value < 0;
  return (
    <div className={css.pair}>
      <span className={css.pairName}>{name}</span>
      <span className={css.pairMath}>= w₁ + w₂ + 2b</span>
      <span className={`${css.pairValue} ${tone(value)}`}>{signed(value)}</span>
      <span className={css.pairNeeds}>
        <span>needs to be {needsPositive ? 'above' : 'below'} 0</span>
        <span className={ok ? css.ok : css.no} aria-label={ok ? 'satisfied' : 'not satisfied'}>
          {ok ? '✓' : '✗'}
        </span>
      </span>
    </div>
  );
}
