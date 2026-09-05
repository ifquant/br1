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

- Audit fixed-layout cache release independently of completed C9 paginator resource accounting.
  Why: the fixed-layout renderer has section loads without corresponding unload calls; paginator final-release proof cannot establish its cache/disposal policy.
  Context: C9 ports the EPUB Loader reference/content-read fix and removes the paginator's duplicate release. Its real shared-book and br1 resource gates pass without a second popup renderer or host compensation.
  Depends on: fixed-layout spread/scroll cache ownership, final disposal and shared-book tests. Keep this distinct from pending-open cancellation above.

- Preserve the prior reader display/state when a destination chapter fails to load.
  Why: existing paginator far navigation retires old views before loading the destination and catches failure as an empty display result.
  Context: this predates C9. The C9 rejected-load regression proves other holders remain valid and final resources release; it does not claim to restore the failing view's previous display, location or history.
  Depends on: a separate navigation-failure admission/rollback audit, not a second resource store or blanket book destruction.

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
