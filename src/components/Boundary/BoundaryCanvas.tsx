import { useEffect, useRef } from 'react';
import css from './BoundaryCanvas.module.css';
import { contourSegments, fieldToImage, readRamp, type Ramp } from './painter';
import { fromPixel, sampleField, toPixel, weightArrow } from '../../nn/boundary';
import type { Dataset } from '../../nn/datasets';
import type { Network } from '../../nn/types';

export interface BoundaryCanvasProps {
  net: Network;
  dataset: Dataset;
  /** Read a hidden neuron instead of the output, for the mini-heatmaps. */
  probe?: { layer: number; neuron: number };
  showPoints?: boolean;
  /**
   * Say what the two marks mean. On by default whenever points are shown,
   * because a circle and a square mean nothing until somebody says so.
   */
  legend?: boolean;
  /** Draw which way a single neuron's weights point, standing on the boundary. */
  showWeightArrow?: boolean;
  /** Sampling grid. Small is fast and, upscaled, still looks smooth. */
  resolution?: number;
  threshold?: number;
  /** Click to place a point, for the sandbox. */
  onPlacePoint?: (x: number, y: number, alt: boolean) => void;
  label?: string;
  caption?: string;
  className?: string;
}

/**
 * The network's answer across the whole input space, painted as an image.
 *
 * Repaints are coalesced into one animation frame, so dragging a weight
 * produces at most one repaint per frame no matter how many changes arrive.
 */
export function BoundaryCanvas({
  net,
  dataset,
  probe,
  showPoints = true,
  legend = true,
  showWeightArrow = false,
  resolution = 96,
  threshold = 0.5,
  onPlacePoint,
  label,
  caption,
  className,
}: BoundaryCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scratch = useRef<{
    field: Float32Array | null;
    image: ImageData | null;
    offscreen: HTMLCanvasElement | null;
    ramp: Ramp | null;
    frame: number;
  }>({ field: null, image: null, offscreen: null, ramp: null, frame: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
      scratch.current.frame = 0;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const cssSize = canvas.clientWidth || 240;
      const pixels = Math.round(cssSize * dpr);
      if (canvas.width !== pixels || canvas.height !== pixels) {
        canvas.width = pixels;
        canvas.height = pixels;
      }

      const s = scratch.current;
      if (!s.ramp) s.ramp = readRamp(canvas);
      const ramp = s.ramp;

      s.field = sampleField(net, {
        domain: dataset.domain,
        resolution,
        probe,
        into: s.field ?? undefined,
      });

      if (!s.offscreen) s.offscreen = document.createElement('canvas');
      const off = s.offscreen;
      if (off.width !== resolution) {
        off.width = resolution;
        off.height = resolution;
        s.image = null;
      }
      const offCtx = off.getContext('2d');
      if (!offCtx) return;
      if (!s.image) s.image = offCtx.createImageData(resolution, resolution);
      offCtx.putImageData(fieldToImage(s.field, resolution, ramp, s.image), 0, 0);

      // Upscaling a coarse field with smoothing gives soft, honest gradients
      // for a fraction of the sampling cost of painting every pixel.
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.clearRect(0, 0, pixels, pixels);
      ctx.drawImage(off, 0, 0, resolution, resolution, 0, 0, pixels, pixels);

      // The boundary itself, drawn exactly rather than left to the gradient.
      const segments = contourSegments(s.field, resolution, threshold);
      if (segments.length) {
        const scale = pixels / (resolution - 1);
        ctx.beginPath();
        for (let i = 0; i < segments.length; i += 4) {
          ctx.moveTo(segments[i] * scale, segments[i + 1] * scale);
          ctx.lineTo(segments[i + 2] * scale, segments[i + 3] * scale);
        }
        ctx.strokeStyle = `rgba(${ramp.ink[0]}, ${ramp.ink[1]}, ${ramp.ink[2]}, 0.85)`;
        ctx.lineWidth = 1.5 * dpr;
        ctx.stroke();
      }

      if (showPoints) {
        // Four corners on a logic square want bolder marks than a hundred
        // scattered points do.
        const dot = Math.max(3 * dpr, pixels / (dataset.points.length <= 8 ? 42 : 80));
        for (const point of dataset.points) {
          const [px, py] = toPixel(point.x[0], point.x[1], dataset.domain, pixels, pixels);
          const isOne = point.y[0] >= threshold;
          ctx.beginPath();
          // Two classes, two shapes: the labels survive without colour.
          if (isOne) {
            ctx.arc(px, py, dot, 0, Math.PI * 2);
          } else {
            const r = dot * 0.88;
            ctx.rect(px - r, py - r, r * 2, r * 2);
          }
          ctx.fillStyle = isOne
            ? `rgb(${ramp.high[0]}, ${ramp.high[1]}, ${ramp.high[2]})`
            : `rgb(${ramp.low[0]}, ${ramp.low[1]}, ${ramp.low[2]})`;
          ctx.fill();
          ctx.strokeStyle = `rgba(${ramp.paper[0]}, ${ramp.paper[1]}, ${ramp.paper[2]}, 0.95)`;
          ctx.lineWidth = Math.max(1, dot * 0.34);
          ctx.stroke();
        }
      }

      // Last, so nothing in the data can bury it.
      if (showWeightArrow) {
        const arrow = weightArrow(net, dataset.domain);
        if (arrow) {
          const [ax, ay] = toPixel(arrow.from[0], arrow.from[1], dataset.domain, pixels, pixels);
          const [bx, by] = toPixel(arrow.to[0], arrow.to[1], dataset.domain, pixels, pixels);
          const angle = Math.atan2(by - ay, bx - ax);
          const head = 9 * dpr;
          const trace = () => {
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(bx, by);
            ctx.moveTo(bx - head * Math.cos(angle - 0.45), by - head * Math.sin(angle - 0.45));
            ctx.lineTo(bx, by);
            ctx.lineTo(bx - head * Math.cos(angle + 0.45), by - head * Math.sin(angle + 0.45));
          };
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          // A paper outline underneath, so the arrow reads on warm and cool
          // ground alike.
          trace();
          ctx.strokeStyle = `rgba(${ramp.paper[0]}, ${ramp.paper[1]}, ${ramp.paper[2]}, 0.92)`;
          ctx.lineWidth = 5 * dpr;
          ctx.stroke();
          trace();
          ctx.strokeStyle = `rgb(${ramp.ink[0]}, ${ramp.ink[1]}, ${ramp.ink[2]})`;
          ctx.lineWidth = 2 * dpr;
          ctx.stroke();
          // Where it stands on the line.
          ctx.beginPath();
          ctx.arc(ax, ay, 3.2 * dpr, 0, Math.PI * 2);
          ctx.fillStyle = `rgb(${ramp.ink[0]}, ${ramp.ink[1]}, ${ramp.ink[2]})`;
          ctx.fill();
          ctx.strokeStyle = `rgba(${ramp.paper[0]}, ${ramp.paper[1]}, ${ramp.paper[2]}, 0.95)`;
          ctx.lineWidth = 1.5 * dpr;
          ctx.stroke();
        }
      }
    };

    // Coalesce every change into a single frame.
    if (scratch.current.frame) cancelAnimationFrame(scratch.current.frame);
    scratch.current.frame = requestAnimationFrame(draw);

    return () => {
      if (scratch.current.frame) cancelAnimationFrame(scratch.current.frame);
      scratch.current.frame = 0;
    };
  }, [net, dataset, probe, resolution, showPoints, showWeightArrow, threshold]);

  // The theme can change under us; drop the cached palette when it does.
  useEffect(() => {
    if (!window.matchMedia) return;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      scratch.current.ramp = null;
    };
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const handleClick = onPlacePoint
    ? (e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const [x, y] = fromPixel(
          e.clientX - rect.left,
          e.clientY - rect.top,
          dataset.domain,
          rect.width,
          rect.height,
        );
        onPlacePoint(x, y, e.altKey || e.shiftKey);
      }
    : undefined;

  return (
    <figure className={`${css.wrap} ${className ?? ''}`} style={{ margin: 0 }}>
      <div className={css.square}>
        <canvas
          ref={canvasRef}
          className={`${css.canvas} ${onPlacePoint ? css.clickable : ''}`}
          role="img"
          aria-label={
            label ??
            `The network’s answer across the input space. Warm means above the threshold, cool means below, and the dark line is the boundary between them.${
              showWeightArrow ? ' An arrow standing on the line shows which way the weights point.' : ''
            }`
          }
          onClick={handleClick}
        />
      </div>
      {showPoints && legend && (
        <p className={css.legend}>
          <span className={css.key}>
            <i className={css.keyDot} aria-hidden="true" />
            should fire
          </span>
          <span className={css.key}>
            <i className={css.keySquare} aria-hidden="true" />
            should stay quiet
          </span>
        </p>
      )}
      {caption && <figcaption className={css.caption}>{caption}</figcaption>}
    </figure>
  );
}

/** A small read-only heatmap of one hidden neuron, for level 5. */
export function MiniBoundary({
  net,
  dataset,
  layer,
  neuron,
  label,
}: {
  net: Network;
  dataset: Dataset;
  layer: number;
  neuron: number;
  label: string;
}) {
  return (
    <div className={css.miniItem}>
      <BoundaryCanvas
        net={net}
        dataset={dataset}
        probe={{ layer, neuron }}
        showPoints={false}
        resolution={48}
        className={css.mini}
        label={`${label}: the line this neuron draws on its own.`}
      />
      <p className={css.miniLabel}>{label}</p>
    </div>
  );
}

export const miniRowClass = css.miniRow;
