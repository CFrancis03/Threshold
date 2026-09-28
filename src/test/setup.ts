import '@testing-library/jest-dom/vitest';

// jsdom has no canvas. Every component that draws one asks for a 2-D context
// and bails out politely when it does not get one, so answer "none" quietly
// instead of letting jsdom print a not-implemented error for each render.
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = (() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext;
}
