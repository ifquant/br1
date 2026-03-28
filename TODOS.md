# br1 TODOs

## Design Debt

- Create a formal `DESIGN.md` for `br1`.
  Why: the current plan now contains a real visual system, but it still lives inside a single strategy/design doc.
  Context: preserve the agreed typography split, color roles, bridge-as-marginalia metaphor, and component tone before implementation spreads across screens.
  Depends on: the approved design plan at `/Users/dev/.gstack/projects/br1/dev-unknown-design-20260328-004024.md`.

## Engineering Debt

- Split the unified reader/bridge store after the first stable v1 loop.
  Why: the current plan explicitly chooses one larger store for speed, which will increase coupling between reading state, bridge UI state, persistence, and TTS interactions over time.
  Pros: clearer test boundaries, easier bug isolation, lower blast radius when bridge features grow.
  Cons: extra refactor work after v1, temporary churn around store consumers.
  Context: this was accepted during `/plan-eng-review` as a speed-first tradeoff, not as a permanent architecture target.
  Depends on: a working vertical slice with real reader + bridge behavior, so the split follows real usage boundaries instead of guessed ones.

- Add a fixed packaged-app smoke checklist for every desktop build.
  Why: `tauri build` succeeding is not enough; testers need a repeatable check that the shipped artifact can actually launch, import, read, bridge, and restore state.
  Pros: catches packaging regressions early, makes release quality less dependent on memory, stabilizes tester handoff.
  Cons: small recurring verification cost on every packaged build.
  Context: v1 now includes a minimum viable distribution path, so artifact verification becomes part of product quality, not optional ops work.
  Depends on: the first reproducible packaged build flow being in place.
