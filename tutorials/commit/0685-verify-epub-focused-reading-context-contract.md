# 0685 Verify EPUB focused-reading context stays human-readable on reopen

## Why

The earlier EPUB-focused smoke already proved the hidden same-book resume seam could reopen a selection-owned excerpt after the live Foliate selection disappeared. What it did not prove was the visible reading-context contract on that same path: the focused-reading overlay needed evidence that it still showed human-readable source/progress context instead of leaking raw restore locators such as `epubcfi(...)` back into the primary UI.

## What changed

- extended the existing EPUB selection-owned focused-reading reopen smoke in `tests/e2e/library-smoke.spec.ts`
- made the smoke read the overlay's `当前阅读上下文` section on both first open and reopen
- asserted the overlay shows readable context labels for `摘录来源` and `进度`, plus a non-empty human-readable source value for that selection-owned EPUB excerpt path
- required the EPUB footer to expose a real human-readable percentage before focused reading opens, then asserted that exact percentage appears in the overlay context on first open and reopen
- asserted the source chip keeps the same human-readable value across first open and reopen instead of degrading into a raw restore locator
- explicitly asserted the visible focused-reading overlay does not surface raw `epubcfi(...)` restore locators
- tightened the selection wait so the smoke waits for the real `高亮` action button instead of only the popup shell

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader reuses the exited epub selection-owned focused-reading excerpt on reopen in web mode"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- no product-code changes because the existing overlay already hid raw restore locators correctly on this EPUB path
- no new reload coverage, route refactor, or Tauri reopen behavior
- no claim that the smoke proves footer/overlay string parity beyond the exact visible progress percentage it captures and asserts, plus the non-empty visible source chip it preserves
- no TTS, translation, sidebar, PDF, or CBZ expansion
