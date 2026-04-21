# 0316 - Surface Repair State In Library Header

This slice makes the library repair queue visible from the top-level library controls, not only inside the recovery section. The goal is to keep broken-copy recovery discoverable while users sort, filter, or search the shelf.

## What Changed

- Added an optional `statusSummary` prop to `LibraryHeader`.
- Derived a desktop-only repair summary from the filtered recovery queue.
- Rendered the summary as `待修复 X · 可批量 Y · 需复核 Z` beside the status filter pills.
- Kept the header quiet when there is no desktop recovery queue, so web/sample mode does not show irrelevant repair chrome.
- Extended the focused desktop bulk-repair regression to verify the header summary before and after bulk repair.

## Implementation Notes

The source of truth remains the existing recovery queue model in `src/routes/library/+page.svelte`. The header receives only a display string, which keeps `LibraryHeader` as a reusable chrome component instead of teaching it library repair semantics.

The regression intentionally checks two separate surfaces:

- the header status summary for the global repair signal
- the `待修复书籍` section summary for queue-local counts

This separation matters because the header and the repair section have different DOM ownership and different user jobs.

## Verification

- `pnpm check` (PASS)
- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts -g "library renders the reading-first shell in web mode"` (PASS)
- `bash scripts/automation/test-tauri-webdriver.sh pnpm exec wdio run wdio.conf.ts --mochaOpts.grep "bulk repairs eligible broken library copies"` (PASS)
- `git diff --check` (PASS)

## Not Included

- Durable repair queue persistence is still deferred.
- This does not add new repair behavior; it only surfaces the existing queue state globally.
