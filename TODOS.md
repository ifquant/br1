# br1 TODOs

## Design Debt

- Create a formal `DESIGN.md` for `br1`.
  Why: the current plan now contains a real visual system, but it still lives inside a single strategy/design doc.
  Context: preserve the agreed typography split, color roles, bridge-as-marginalia metaphor, and component tone before implementation spreads across screens.
  Depends on: the approved design plan at `/Users/dev/.gstack/projects/br1/dev-unknown-design-20260328-004024.md`.

## Engineering Debt

- Audit cancellation of an in-flight Foliate open during source replacement or teardown.
  Why: native `close()` removes the current renderer but does not cancel an awaited `open()` or destroy book resources.
  Context: C8B retires already-open renderers before new source loading and on teardown, fixing retained interactive old documents. It does not introduce a new asynchronous open owner.
  Depends on: a separate source-open lifecycle audit and held-open completion tests; do not equate the C8B selection epoch with complete open cancellation.

- Gate C8C footnote actions and writes on current validated popup selections.
  Why: a nonempty CFI does not prove the intended source range, and identical preview text does not identify the current popup request.
  Context: the independent Sol source audit of `631cd6454` found no actual resolve-and-text round trip and identified an upstream popup-view late-completion race. Nested `57c9358ad` serves second-view extraction mapping and exports, not a required native br1 renderer path.
  Depends on: resolving the generated CFI in the correct pristine section with text and boundary checks; preserving the existing Viewport epoch and extending book/view/payload identity checks through close, replacement, navigation, teardown, and asynchronous UI completion. Never use current-location/TOC fallback or anchor synthetic alt/data text. Full gates are recorded in `.planning/readest-alignment-analysis/2026-09-05-authored-layout-commit-audit.md` under C8A/C8B.
  Current boundary: C8B adds pristine-CFI round-trip validation through a dedicated Stage selection event, not the route's generic annotation channel. C8C must retain these identity checks through each action and write; action applicability, persistence and C8D reverse mapping remain pending.

- Decide source-footnote visibility together with destination access before hiding EPUB asides.
  Why: br1 previews only recognized footnote links; ordinary links, rejected numeric markers, and fallback navigation can still need the original aside.
  Context: S2-R04C4 marks Readest `d6e981e56`'s exact custom-font/namespace ordering bug not-applicable, not source-aside border suppression as complete.
  Depends on: an explicit hide/reveal contract covering normal navigation and image-only targets. If custom font faces and namespaced selectors are later assembled together, declare the namespace before font-face and style rules.

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
