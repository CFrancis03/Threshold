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

## Where the teaching lives

The levels are deliberately short: a sentence or two, a puzzle, a note on what you just worked out. Everything else is optional and sits underneath, so the twenty-minute path stays twenty minutes.

- `src/content/deeper.tsx` is the "Go deeper" note under each level. Each is written to be spoiler-safe, because it is open while you are still stuck; level 4's stays hidden until the hidden layer has been taken.
- `src/content/glossary.ts` is the words the site uses, alphabetical, each with where you first meet it.
- `src/content/selfCheck.ts` is the five things a visitor should leave able to explain, asked before they are answered.
- `src/components/FourDemands.tsx` is the interactive argument for why one neuron can never do XOR. It appears after a few failed attempts, next to the hidden layer rather than in front of it.
- `src/components/HiddenSpace.tsx`, `CollapseDemo.tsx` and `GradientDescent1D.tsx` are the three explainers: what a hidden layer does to the data, why layers with no squash are one layer in disguise, and gradient descent on a single weight.

The How it works page has a table of contents and section links, so `#/how/words` lands on the glossary.

## Tests

`npm test` runs the whole suite. The ones worth knowing about:

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
- **The XOR argument is checked, not just argued.** The two pair-sums in level 4's
  explainer are the same number for every possible weight (`w1 + w2 + 2b`), so
  one of the two demands always fails. A test confirms it across hundreds of
  random neurons, and that no single neuron ever satisfies all four.
- **The collapse claim is proved numerically.** Layers with no squash multiply
  out into one layer, and `collapseLinear` does exactly that; tests confirm the
  result answers identically to the original across many shapes and inputs.
- **The learning-rate captions match the simulation.** For every rate the slider
  can reach, the widget's "too small / about right / getting big / too big"
  label is compared against what the ball actually does over twenty steps.
