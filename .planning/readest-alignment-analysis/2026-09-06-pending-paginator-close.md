# Pending Paginator Loads Across Close

## Scope and Priority

User-approved follow-up before S2-R04C12. Fix the resource leak captured in
`2026-09-06-c11b-c9-pending-load-trace.json`, without rewriting the historical
C11B result. Starting points: br1 `40262c9637ad205571980450c9ee87841da878c2`
and foliate-js `c88587e6f2afeb560dffee52c6c4dac2ca632e8c`.

Production owner: `foliate-js/paginator.js`. Integration evidence: br1's
existing native EPUB resource-lifetime suite. No public API, dependency,
vendor asset, host compensation or book-loader redesign is authorized.

## Required Evidence

1. Hold a real chapter load, close its reader, then release the gate. Prove
   the old code fails and the fixed code releases the acquired reference once.
2. Cover direct and adjacent loading, content-read and registered iframe
   boundaries, repeated close, and rejection before acquisition. A retired
   reader must not register late views or publish load/navigation events.
3. Preserve a second reader sharing the same book: its resources remain
   fetchable and decodable until it closes; final target URLs revoke once.
4. Preserve the existing C9 assertions and run the full resource suite plus
   all C11 page-turn, animation and load-admission regressions.

Resource lifetime is distinct from C11 motion cancellation. Cancelling a turn
may retain its view for later reuse; closing its paginator retires the owner.
An in-progress content read must finish before its acquired reference is
released, otherwise it can reacquire a cold cache entry.

## Evidence Log

- Baseline: original four resource/C11 specs, Chrome, one worker, no retries:
  **16/16 PASS**. Log: `/tmp/br1-pending-close-baseline.log`. This does not
  invalidate the captured failure or substitute for deterministic RED evidence.
- Plan boundary: Astra high reviewed both load paths and teardown, approving
  the narrow owner-transfer contract above.
- Deterministic RED on unchanged source: **4/4 failed**, each after gate
  entry, reader close and release. Both direct and background paths fail to
  settle at `section.load` and `loadContent`. Log:
  `/tmp/br1-pending-close-red.log`. The grouped cases stopped at the content
  failure, so this run does not prove the iframe variant executed.
- Initial GREEN attempt: **27/28 PASS**. Resource cases passed 17/17,
  animation 6/6 and page-turn 4/4. Existing C11 load-admission failed its
  iframe `refusalPreservesBarrier` assertion. Log:
  `/tmp/br1-pending-close-green.log`. This regression blocks completion.
- Independent test review requested stronger original-target URL retention
  during the content gate and concrete iframe identity, not only a timing-span
  name. These proof corrections are in progress; no old assertion is weakened.
- Final GREEN, source review and completion gates: pending.

### Review Corrections

- Original-target URL retention and concrete iframe identity passed independent
  Terra test re-review. Four empty-load retry cases were added: a null result
  acquires nothing, calls neither content nor unload, and permits later retry
  while another reader holds the exact target chapter.
- Strengthened resource suite: **21/21 PASS**, no retries. Log:
  `/tmp/br1-pending-close-resources2.log`.
- C11 diagnostic: a clean-server bounded run reproduced the failure on its
  first case, with nine not run. Only `pageUnchanged` was false; admission,
  position, primary, history and event predicates remained true. Log:
  `/tmp/br1-pending-close-probe-repeat2.log`. An earlier attempted run failed
  at server connection and is excluded from behavioral evidence.
- Root correction: `render()` still cancels motion, but defers layout while a
  locked section/iframe load owns admission. Relayout of a registered but
  incomplete primary had changed its relative offset before `View.load`
  reached render setup. Its own later layout uses current dimensions.
- Final original C11 suites: **33/33 PASS** (11 unique cases, three runs).
  Full resource suite: **42/42 PASS** (21 unique cases, two runs). Both use
  Chrome, one worker and zero retries; these are explicit repeated checks,
  not replacement results for earlier failures. Logs:
  `/tmp/br1-pending-close-c11-final.log` and
  `/tmp/br1-pending-close-resources-final.log`.
- Independent Terra source and test reviews passed after the recorded fixes.
  Broader regressions, final static/build checks and Astra final review remain
  pending. The diagnostic spec was removed; original C11 specs are unchanged.

### Final Review Follow-up

- Broad browser regressions passed **60/60**; selected library regressions
  passed **4/4**. Logs: `/tmp/br1-pending-close-broad-final.log` and
  `/tmp/br1-pending-close-library-final.log`.
- Astra final review found a missing success boundary: a synchronous
  `stabilized` listener can close the reader, yet the non-animated navigation
  still reports success and appends history after close. The existing green
  gates do not cover that path. A dedicated RED/GREEN regression and final
  lifecycle check are required before submission.
- Dedicated synchronous-close RED: both paginated and scrolled cases failed
  with successful `{index: 1}` navigation after the target rendered and the
  listener closed exactly once. Log:
  `/tmp/br1-pending-close-stabilized-red.log`.
- Correction: revalidate concrete view ownership after `stabilized` and reject
  destruction at the private/public navigation success boundaries. Existing
  View strict-false handling supplies the history guard; `view.js` is unchanged.
- Final2 verification of this exact candidate passed; see acceptance below.

## Final Acceptance

The approved three steps are complete. No C12 implementation is included.
Final2 used Chrome, one worker, zero retries and frozen production/test files.
Paired foliate-js implementation: `37edf61c6e94bd737812f6ae3e6184c57e992cbe`.

| Gate | Result |
|---|---|
| Resource lifetime spec | 23/23 PASS: five original C9 cases plus 18 added cases |
| Three unchanged C11 specs | 11/11 PASS |
| Authored text, footnotes, mapping, direction, ZIP and MOBI/CBZ | 60/60 PASS |
| Four selected library cases | 4/4 PASS |
| Unique browser cases, without counting earlier reruns | 98/98 PASS |
| `pnpm check` | PASS, zero errors and warnings |
| `pnpm test:reader-helpers` | 99/99 PASS |
| Source strict TypeScript and standalone resource/C11 TypeScript | PASS |
| `node --test ../foliate-js/tests/view-zip-loader.test.mjs` | 6/6 PASS |
| `node --check` on paginator and view | PASS |
| `pnpm exec vite build` | PASS, no vendor regeneration or Tauri packaging |
| Independent reviews | Terra task reviews and Astra final code/test review PASS |

Browser command options: `BR1_PLAYWRIGHT_CHANNEL=chrome pnpm exec playwright test`
with `--workers=1 --retries=0 --max-failures=1`. Focused inputs were
`foliate-epub-resource-lifetime.spec.ts`, `foliate-vertical-animation.spec.ts`,
`foliate-vertical-page-turn.spec.ts` and `foliate-turn-load-admission.spec.ts`.
The standalone E2E type check used existing Node 20 types from
`node_modules/.pnpm/@types+node@20.19.37/node_modules/@types`; no dependency
installation was needed. A preliminary missing-type lookup was corrected,
not treated as a source error or hidden as a pass.

Final logs: `/tmp/br1-pending-close-final2-*.log`. Before/after SHA-256:

| File | SHA-256 |
|---|---|
| `foliate-js/paginator.js` | `bb094081e8d57fcf7a24387ffa5a2cc8e6eb004a5e3e6ffd5259538df8b24d17` |
| `foliate-js/view.js` (unchanged) | `323a5e1125b761e33692904cacf84a0f033cd0a64b7bc84a704b6be2d02a5236` |
| Resource spec | `0670fff14a57f39648044581bb7606272c22797009e820c51505437a4fd17d82` |

Original C9 assertions, all three original C11 specs and the historical trace
are unchanged. The 678-entry ledger remains 60 covered, 406 partial, 77 gap and
135 not-applicable. This local defect follow-up does not claim a new upstream
commit or reduce the 55 remaining parity task IDs. Task-owned build/helper
outputs were removed, and the test server was stopped.

## Not Included

- Cancelling an unfinished high-level `View.open` before its renderer exists.
- Restoring a failed navigation's previous display, location or history.
- Fixed-layout disposal, mixed-direction preload ownership or C12 features.
- Native touch devices, Safari and packaged Tauri acceptance.
