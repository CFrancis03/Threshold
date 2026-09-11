/**
 * Painting a sampled field onto a canvas.
 *
 * Two layers: a diverging heatmap for "what does the network answer here",
 * and an exact contour line at the threshold — the decision boundary itself,
 * which is the thing level 3 is named after.
 */

export type Rgb = [number, number, number];

export interface Ramp {
  /** Output 0: the same steel blue that means a negative weight. */
  low: Rgb;
  /** Output exactly at the threshold. */
  mid: Rgb;
  /** Output 1: the same copper that means a positive weight. */
  high: Rgb;
  ink: Rgb;
  paper: Rgb;
}

function parseColor(value: string): Rgb {
  const v = value.trim();
  if (v.startsWith('#')) {
    const hex = v.length === 4 ? v[1] + v[1] + v[2] + v[2] + v[3] + v[3] : v.slice(1, 7);
    const n = parseInt(hex, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const nums = v.match(/[\d.]+/g);
  if (nums && nums.length >= 3) return [Number(nums[0]), Number(nums[1]), Number(nums[2])];
  return [128, 128, 128];
}

/**
 * Reads the palette off the page rather than hard-coding it, so the heatmap
 * follows the theme and stays consistent with the edge colours.
 */
export function readRamp(el: Element): Ramp {
  const s = getComputedStyle(el);
  const paper = parseColor(s.getPropertyValue('--paper') || '#f2efe9');
  return {
    low: parseColor(s.getPropertyValue('--inhibit') || '#1f5a80'),
    mid: paper,
    high: parseColor(s.getPropertyValue('--excite') || '#b8501e'),
    ink: parseColor(s.getPropertyValue('--ink') || '#171a1f'),
    paper,
  };
}

function lerp(a: Rgb, b: Rgb, t: number, out: Rgb) {
  out[0] = a[0] + (b[0] - a[0]) * t;
  out[1] = a[1] + (b[1] - a[1]) * t;
  out[2] = a[2] + (b[2] - a[2]) * t;
}

/**
 * Writes the field into an ImageData. The scale is deliberately gentle near
 * the threshold and saturates towards the ends, so an uncertain region looks
 * uncertain instead of looking like a decision.
 */
export function fieldToImage(field: Float32Array, res: number, ramp: Ramp, image: ImageData): ImageData {
  const data = image.data;
  const rgb: Rgb = [0, 0, 0];
  for (let i = 0; i < field.length; i++) {
    const v = field[i];
    if (v < 0.5) lerp(ramp.mid, ramp.low, Math.min(1, (0.5 - v) * 2 * 0.82), rgb);
    else lerp(ramp.mid, ramp.high, Math.min(1, (v - 0.5) * 2 * 0.82), rgb);
    const p = i * 4;
    data[p] = rgb[0];
    data[p + 1] = rgb[1];
    data[p + 2] = rgb[2];
    data[p + 3] = 255;
  }
  void res;
  return image;
}

/**
 * Marching squares: the exact line where the field crosses the threshold.
 *
 * For every cell of the grid we look at which of its four corners are above
 * the threshold. That pattern tells us which edges the boundary crosses, and
 * a straight interpolation along those edges tells us where. Joining those
 * points gives the boundary to sub-cell accuracy.
 */
export function contourSegments(field: Float32Array, res: number, threshold = 0.5): number[] {
  const out: number[] = [];
  const at = (r: number, c: number) => field[r * res + c];

  for (let r = 0; r < res - 1; r++) {
    for (let c = 0; c < res - 1; c++) {
      const tl = at(r, c);
      const tr = at(r, c + 1);
      const br = at(r + 1, c + 1);
      const bl = at(r + 1, c);

      const index =
        (tl >= threshold ? 8 : 0) | (tr >= threshold ? 4 : 0) | (br >= threshold ? 2 : 0) | (bl >= threshold ? 1 : 0);
      if (index === 0 || index === 15) continue;

      // Crossing points on each of the cell's four edges.
      const frac = (a: number, b: number) => {
        const d = b - a;
        return Math.abs(d) < 1e-12 ? 0.5 : (threshold - a) / d;
      };
      const top: [number, number] = [c + frac(tl, tr), r];
      const right: [number, number] = [c + 1, r + frac(tr, br)];
      const bottom: [number, number] = [c + frac(bl, br), r + 1];
      const left: [number, number] = [c, r + frac(tl, bl)];

      const push = (a: [number, number], b: [number, number]) => out.push(a[0], a[1], b[0], b[1]);

      switch (index) {
        case 1:
        case 14:
          push(left, bottom);
          break;
        case 2:
        case 13:
          push(bottom, right);
          break;
        case 3:
        case 12:
          push(left, right);
          break;
        case 4:
        case 11:
          push(top, right);
          break;
        case 6:
        case 9:
          push(top, bottom);
          break;
        case 7:
        case 8:
          push(left, top);
          break;
        // Saddle points: two separate strands pass through the same cell.
        case 5:
          push(left, top);
          push(bottom, right);
          break;
        case 10:
          push(left, bottom);
          push(top, right);
          break;
      }
    }
  }
  return out;
}
