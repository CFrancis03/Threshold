# Threshold

Seven puzzles that teach how a neural network works by letting you build one by
hand, one neuron at a time, until you hand the job over to gradient descent and
watch it learn.

Live network diagrams throughout: drag a connection to change its weight, drag a
neuron to change its bias, and watch the answer move. The maths is written out
longhand in `src/nn/` with no libraries, because the code is meant to be part of
the explanation.

## Running it

```sh
npm install
npm run dev        # http://localhost:5173
```

## The rest of the scripts

```sh
npm test           # the whole suite, once
npm run test:watch # the suite, watching
npm run typecheck  # tsc, no emit
npm run build      # typecheck, then a static bundle into dist/
npm run preview    # serve dist/ locally
```

## Deploying

`npm run build` produces a plain static site in `dist/`. It uses hash routing
and relative asset paths, so it can be dropped onto any static host — GitHub
Pages, Netlify, S3, a folder behind nginx — with no rewrite rules, no server and
no configuration. There is no backend: progress is kept in the visitor's own
`localStorage` and never leaves the browser.

### GitHub Pages

`.github/workflows/pages.yml` builds and publishes on every push to the default
branch. It does nothing until Pages is switched on, which is a one-time manual
step: **Settings → Pages → Source → GitHub Actions**. Until that is set, the
workflow will run and then fail at the deploy step.

Two things make this work at a project URL like `user.github.io/Threshold/`,
where a lot of single-page apps break:

- **Relative asset paths.** `base: './'` in `vite.config.ts`, so nothing depends
  on the site living at the domain root.
- **Hash routing.** Deep links such as `.../Threshold/#/play/4` survive a hard
  reload without the 404-fallback trick, because the server only ever sees
  `index.html`.

A `.nojekyll` file is not needed. The Actions deployment serves the artifact
as-is without running Jekyll, and Vite's output directory is `assets/`, which
Jekyll would not have stripped anyway.

## How it is put together

```
src/
  nn/          the neural network, as plain data and pure functions
  components/  NetworkView (the SVG diagram), the Ledger, the boundary canvas
  game/        level definitions and the win conditions
  pages/       landing, level map, level, sandbox, how it works
  state/       network editing, progress, the training loop
  styles/      six colour tokens, three type roles, one spacing scale
```

`src/nn/` has no React in it and no dependencies. A `Network` is just numbers in
arrays, and every function that changes one returns a new one, which is what
makes the diagrams and the undo-free sandbox straightforward.

## Tests

`npm test` runs 158 of them. The ones worth knowing about:

- **Backprop is checked against numerical gradients** across four network
  shapes, four activation functions and both loss functions. The calculus is
  provably right rather than plausibly right.
- **Every level is proved solvable** by running a known answer through the real
  win condition, and proved non-trivial by checking an untouched network fails.
- **Level 4's claim is proved, not asserted.** A test sweeps 68,000 settings of
  a single neuron and confirms that three of four rows really is the ceiling for
  XOR, before the level tells the player so.
- **Level 7's answer is found, not written down.** Its "known solution" is
  produced by running the same training step the Train button runs, at the
  shipped default learning rate.
