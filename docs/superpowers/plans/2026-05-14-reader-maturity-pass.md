# Reader Maturity Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the next maturity gap between `br1` and local `readest` by improving reading modes, inline translation/TTS behavior, annotation interaction, and reader file boundaries without reopening already-shipped library/catalog/sync lines.

**Architecture:** Treat `readest` as the behavior reference, not a file-by-file port. Add small reader-domain helpers first, then mount UI surfaces through existing `ReaderViewport`, `ReaderStage`, `ReaderNotebook`, and route coordination. Keep `src/routes/reader/+page.svelte` as a coordinator only; every task that adds reader behavior must also extract at least one helper or component boundary when it touches a large file.

**Tech Stack:** SvelteKit 5, TypeScript, Tauri 2, foliate-js, Playwright web smoke tests, focused TypeScript helper tests, existing `tutorials/commit` ledger.

---

## Scope Check

This plan is a maturity pass, not a new product direction. It deliberately avoids:

- adding new translation providers
- adding new catalog/library/sync features
- rewriting the whole reader route in one commit
- making route query strings carry large text payloads
- copying Readest React components directly into Svelte

Reference Readest surfaces used for this plan:

- `/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/reader/hooks/useTextTranslation.ts`
- `/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/reader/hooks/useTTSControl.ts`
- `/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/reader/components/tts/TTSPanel.tsx`
- `/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/reader/components/annotator/AnnotationPopup.tsx`
- `/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/reader/components/annotator/AnnotationTools.tsx`
- `/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/reader/components/FootnotePopup.tsx`
- `/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/reader/components/paragraph/ParagraphOverlay.tsx`
- `/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/reader/components/rsvp/RSVPControl.tsx`

Current `br1` hotspots:

- `/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte` is still about 2500 lines after ownership extraction.
- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte` is about 4100 lines and still owns too much annotation/list presentation.
- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte` is about 1900 lines and is the right boundary for renderer observation, inline marks, and footnote/selection events.
- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderTtsWorkspace.svelte` and `ReaderTtsMiniBar.svelte` are already the right surfaces for playback maturity work.

## File Structure

Expected new files:

- Create: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/inlineTranslation.ts`
  - Pure state helpers for inline translation queue/status, block ids, visibility, and failure presentation.
- Create: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/inlineTranslation.test.ts`
  - Node-testable helper coverage for queue and status behavior.
- Create: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/playbackQueue.ts`
  - Pure queue/step/timeout model for TTS playback controls before UI wiring.
- Create: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/playbackQueue.test.ts`
  - Node-testable helper coverage for next/previous/timeout/rate state.
- Create: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/readingMode.ts`
  - Pure contracts for paragraph-focus and RSVP-lite reading mode state.
- Create: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/readingMode.test.ts`
  - Node-testable helper coverage for reading-mode entry, exit, and progress semantics.
- Create: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderAnnotationPopup.svelte`
  - Selection-near floating action surface for highlight, note, lookup, translation, and TTS actions.
- Create: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderFootnotePopup.svelte`
  - Footnote/link preview popup mounted by `ReaderViewport`.
- Create: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderInlineTranslationLayer.svelte`
  - Inline translation status and visibility controls when the renderer can surface block-level translation.
- Create: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderPlaybackPanel.svelte`
  - TTS rate, voice, timeout, previous/next, and queue controls that keep `ReaderTtsWorkspace.svelte` smaller.
- Create: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderFocusedReadingOverlay.svelte`
  - Paragraph-focus and RSVP-lite reading surface that stays on the reading canvas.
- Create: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebarAnnotations.svelte`
  - Extracted notes/highlights/bookmark list presentation from `ReaderSidebar.svelte`.

Expected modified files:

- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/types.ts`
  - Add typed contracts for inline translation blocks, annotation popup actions, footnote popup state, and playback queue summaries.
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/index.ts`
  - Export new helper contracts.
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte`
  - Emit block-level translation candidates, popup anchors, and footnote preview events without owning persistence.
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderStage.svelte`
  - Mount overlay components and pass events back to the route/notebook.
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderTtsWorkspace.svelte`
  - Delegate advanced playback controls to `ReaderPlaybackPanel.svelte`.
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderTtsMiniBar.svelte`
  - Keep only collapsed playback actions; do not add queue complexity here.
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte`
  - Extract annotation-heavy surfaces and keep sidebar as tab host.
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte`
  - Coordinate new events and state, then move any new non-trivial decision into helpers.
- Modify: `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`
  - Add focused smokes for inline translation, playback panel, annotation popup, footnote popup, and route/large-file regressions.
- Modify: `/Users/dev/workspace2/hc_apps/br1/.planning/READEST-ALIGNMENT-CHECKLIST.md`
  - Add P16-P19 maturity lines and update each shipped slice.
- Add: `/Users/dev/workspace2/hc_apps/br1/tutorials/commit/0649-*.md` and onward
  - One tutorial per non-trivial shipped commit.

## Phase Order

### P16 Reader Inline Translation And Reading-Mode Surface

Target outcome: translation stops feeling like only a notebook request/result lane. When the renderer can expose visible text blocks safely, the reader can show translated text inline or side-by-side with explicit visibility and provider/error states.

#### Task 1: Define the inline translation domain contract

**Files:**
- Create: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/inlineTranslation.ts`
- Create: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/inlineTranslation.test.ts`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/types.ts`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/index.ts`
- Modify: `/Users/dev/workspace2/hc_apps/br1/.planning/READEST-ALIGNMENT-CHECKLIST.md`
- Add: `/Users/dev/workspace2/hc_apps/br1/tutorials/commit/0649-define-reader-inline-translation-contract.md`

- [ ] **Step 1: Add failing helper tests**

Create tests proving:

- empty source text is ignored
- duplicate block ids are de-duplicated
- translated blocks can be hidden without losing translated text
- failed blocks keep a retryable error state
- source visibility is separate from translated visibility

Run:

```bash
cd /Users/dev/workspace2/hc_apps/br1
pnpm exec svelte-kit sync
pnpm exec tsc -p tsconfig.json --outDir .tmp-inline-translation-tests --noEmit false
node --test ./.tmp-inline-translation-tests/src/lib/reader/inlineTranslation.test.js
```

Expected before implementation: FAIL because `inlineTranslation.ts` does not exist.

- [ ] **Step 2: Implement pure inline translation helpers**

Add a model with these concrete shapes:

```ts
export type ReaderInlineTranslationBlockStatus = 'queued' | 'translating' | 'translated' | 'error';

export type ReaderInlineTranslationBlock = {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLabel: string;
  status: ReaderInlineTranslationBlockStatus;
  error: string;
  updatedAt: number;
};

export type ReaderInlineTranslationState = {
  enabled: boolean;
  showSource: boolean;
  showTranslation: boolean;
  targetLanguage: 'zh' | 'en';
  provider: 'deepl' | 'yandex';
  blocks: ReaderInlineTranslationBlock[];
};
```

Required helpers:

- `createEmptyReaderInlineTranslationState`
- `upsertReaderInlineTranslationCandidate`
- `markReaderInlineTranslationTranslating`
- `markReaderInlineTranslationTranslated`
- `markReaderInlineTranslationError`
- `toggleReaderInlineTranslationVisibility`
- `getReaderInlineTranslationSummary`

Keep helpers pure. They must not call provider APIs or touch DOM.

- [ ] **Step 3: Export and document the boundary**

Add exports from `src/lib/reader/index.ts`. Add beginner-friendly comments explaining that DOM observation belongs to `ReaderViewport`, while queue/status semantics belong to `inlineTranslation.ts`.

- [ ] **Step 4: Verify**

Run:

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
cd /Users/dev/workspace2/hc_apps/br1 && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-inline-translation-tests --noEmit false && node --test ./.tmp-inline-translation-tests/src/lib/reader/inlineTranslation.test.js
git -C /Users/dev/workspace2/hc_apps/br1 diff --check
```

Expected: PASS.

- [ ] **Step 5: Update checklist, write tutorial, commit**

Commit with the required multi-line format:

```bash
git add src/lib/reader/inlineTranslation.ts src/lib/reader/inlineTranslation.test.ts src/lib/reader/types.ts src/lib/reader/index.ts .planning/READEST-ALIGNMENT-CHECKLIST.md tutorials/commit/0649-define-reader-inline-translation-contract.md
git commit -m "feat(reader-translation): define inline translation state"
```

#### Task 2: Surface inline translation candidates from the viewport

**Files:**
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte`
- Create: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderInlineTranslationLayer.svelte`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderStage.svelte`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte`
- Modify: `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`
- Modify: `/Users/dev/workspace2/hc_apps/br1/.planning/READEST-ALIGNMENT-CHECKLIST.md`
- Add: `/Users/dev/workspace2/hc_apps/br1/tutorials/commit/0650-surface-inline-translation-candidates.md`

- [ ] **Step 1: Write a focused web smoke**

Add a Playwright smoke named:

```ts
test('reader exposes inline translation mode without replacing the notebook translation workspace', async ({ page }) => {
  await page.goto('/reader?source=asset&url=%2Fsamples%2Fsample-book.txt&label=Sample%20TXT%20Book');
  await page.getByRole('button', { name: '翻译模式' }).click();
  await expect(page.getByRole('region', { name: '翻译模式' })).toBeVisible();
  await page.getByRole('button', { name: '开启正文内译文' }).click();
  await expect(page.getByRole('region', { name: '正文内译文状态' })).toContainText('等待可翻译正文');
  await expect(page.getByRole('region', { name: '翻译模式' })).toBeVisible();
});
```

Run:

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader exposes inline translation mode without replacing the notebook translation workspace"
```

Expected before implementation: FAIL because the inline translation layer and action do not exist.

- [ ] **Step 2: Emit safe translation candidates**

In `ReaderViewport.svelte`, emit a new `inlinetranslationcandidates` event after reader state updates. For the first slice, use existing safe text sources only:

- TXT: current visible plain-text excerpt
- EPUB/Foliate: current chapter body excerpt already used for source TTS
- PDF/CBZ: emit no candidates and a capability message

Do not walk arbitrary iframe DOM in this task. That belongs to a later optimization once the contract is stable.

- [ ] **Step 3: Add the inline layer**

`ReaderInlineTranslationLayer.svelte` should render:

- enabled/disabled state
- source/translation visibility toggles
- provider/language summary
- block count and current status
- unsupported or waiting copy when no candidates exist

This first UI may show status and block previews; it does not need to insert translated DOM into Foliate content yet.

- [ ] **Step 4: Wire route coordination**

`+page.svelte` owns the inline translation state and passes a presentation slice to `ReaderStage`. Keep provider requests behind the existing translation assistance service path. Do not add a renderer-owned network call.

- [ ] **Step 5: Verify and commit**

Run:

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader exposes inline translation mode without replacing the notebook translation workspace"
git -C /Users/dev/workspace2/hc_apps/br1 diff --check
```

Commit with checklist and tutorial.

#### Task 3: Add paragraph-focus and RSVP-lite reading mode shell

**Files:**
- Create: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/readingMode.ts`
- Create: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/readingMode.test.ts`
- Create: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderFocusedReadingOverlay.svelte`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderStage.svelte`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte`
- Modify: `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`
- Modify: `/Users/dev/workspace2/hc_apps/br1/.planning/READEST-ALIGNMENT-CHECKLIST.md`
- Add: `/Users/dev/workspace2/hc_apps/br1/tutorials/commit/0651-add-focused-reading-mode-shell.md`

- [ ] **Step 1: Add failing helper tests**

Cover:

- paragraph-focus mode starts from the current reader excerpt when available
- RSVP-lite mode splits a selected/current excerpt into words without mutating reader progress
- unsupported formats return a visible capability message
- exiting a focused reading mode restores the ordinary reader canvas state

Run:

```bash
cd /Users/dev/workspace2/hc_apps/br1
pnpm exec svelte-kit sync
pnpm exec tsc -p tsconfig.json --outDir .tmp-reading-mode-tests --noEmit false
node --test ./.tmp-reading-mode-tests/src/lib/reader/readingMode.test.js
```

Expected before implementation: FAIL because `readingMode.ts` does not exist.

- [ ] **Step 2: Implement pure reading-mode helpers**

Add:

- `ReaderFocusedReadingMode = 'off' | 'paragraph' | 'rsvp'`
- `ReaderFocusedReadingState`
- `createReaderFocusedReadingState`
- `startReaderParagraphFocus`
- `startReaderRsvpLite`
- `advanceReaderRsvpWord`
- `exitReaderFocusedReading`
- `getReaderFocusedReadingSummary`

Use `ReaderPreviewState.ttsSourceText` and the current selection as input sources. Do not inspect DOM inside the helper.

- [ ] **Step 3: Add the overlay shell**

`ReaderFocusedReadingOverlay.svelte` should provide:

- a paragraph card using the same typography variables as the reader canvas
- an RSVP-lite word display with previous/next controls
- an exit action
- capability copy for PDF/CBZ or missing text

This first slice is intentionally RSVP-lite. It does not need Readest's full controller, saved RSVP stop position, or temporary Foliate highlight.

- [ ] **Step 4: Wire through existing reader chrome**

Add entry actions near existing focus aids or reader mode controls. Keep persisted focus-aid settings unchanged; this is an explicit temporary reading mode, not a replacement for ruler/focus-aid settings.

- [ ] **Step 5: Verify and commit**

Run:

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
cd /Users/dev/workspace2/hc_apps/br1 && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-reading-mode-tests --noEmit false && node --test ./.tmp-reading-mode-tests/src/lib/reader/readingMode.test.js
pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader opens paragraph focus and rsvp-lite reading modes in web mode"
git -C /Users/dev/workspace2/hc_apps/br1 diff --check
```

Commit with checklist and tutorial.

### P17 TTS Playback Runtime And Panel Maturity

Target outcome: `br1` TTS stops at “can speak current target” less often and gains mature reader controls: rate, timeout, voice availability, previous/next target stepping, and clearer unavailable states.

#### Task 4: Add a playback queue and timeout model

**Files:**
- Create: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/playbackQueue.ts`
- Create: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/playbackQueue.test.ts`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/types.ts`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/index.ts`
- Modify: `/Users/dev/workspace2/hc_apps/br1/.planning/READEST-ALIGNMENT-CHECKLIST.md`
- Add: `/Users/dev/workspace2/hc_apps/br1/tutorials/commit/0652-add-reader-playback-queue-model.md`

- [ ] **Step 1: Add failing queue tests**

Cover:

- queue starts at first segment
- next/previous clamp at boundaries
- timeout countdown disables itself after expiry
- rate is clamped between `0.2` and `3.0`
- empty queue returns a no-target summary

Run:

```bash
cd /Users/dev/workspace2/hc_apps/br1
pnpm exec svelte-kit sync
pnpm exec tsc -p tsconfig.json --outDir .tmp-playback-queue-tests --noEmit false
node --test ./.tmp-playback-queue-tests/src/lib/reader/playbackQueue.test.js
```

Expected before implementation: FAIL because `playbackQueue.ts` does not exist.

- [ ] **Step 2: Implement pure playback helpers**

Add:

- `ReaderPlaybackSegment`
- `ReaderPlaybackQueueState`
- `createReaderPlaybackQueue`
- `moveReaderPlaybackQueueNext`
- `moveReaderPlaybackQueuePrevious`
- `setReaderPlaybackRate`
- `setReaderPlaybackTimeout`
- `getReaderPlaybackQueueSummary`

Use `ReaderTtsSpeechTarget` as the source for segment text/labels so this does not introduce a parallel TTS target model.

- [ ] **Step 3: Verify and commit**

Run:

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
cd /Users/dev/workspace2/hc_apps/br1 && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-playback-queue-tests --noEmit false && node --test ./.tmp-playback-queue-tests/src/lib/reader/playbackQueue.test.js
git -C /Users/dev/workspace2/hc_apps/br1 diff --check
```

Commit with checklist and tutorial.

#### Task 5: Extract the full playback panel from the TTS workspace

**Files:**
- Create: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderPlaybackPanel.svelte`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderTtsWorkspace.svelte`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte`
- Modify: `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`
- Modify: `/Users/dev/workspace2/hc_apps/br1/.planning/READEST-ALIGNMENT-CHECKLIST.md`
- Add: `/Users/dev/workspace2/hc_apps/br1/tutorials/commit/0653-extract-reader-playback-panel.md`

- [ ] **Step 1: Write a focused smoke**

Add a Playwright smoke named:

```ts
test('reader tts workspace exposes mature playback controls in web mode', async ({ page }) => {
  await page.goto('/reader?source=asset&url=%2Fsamples%2Fsample-book.txt&label=Sample%20TXT%20Book&workspace=tts');
  const ttsRegion = page.getByRole('region', { name: '朗读模式' });
  await expect(ttsRegion.getByRole('region', { name: '播放控制' })).toBeVisible();
  await expect(ttsRegion.getByRole('slider', { name: '朗读速度' })).toBeVisible();
  await expect(ttsRegion.getByRole('button', { name: '上一段' })).toBeVisible();
  await expect(ttsRegion.getByRole('button', { name: '下一段' })).toBeVisible();
  await expect(ttsRegion.getByRole('button', { name: '定时关闭' })).toBeVisible();
});
```

Expected before implementation: FAIL.

- [ ] **Step 2: Extract panel UI**

Move rate/previous/next/timeout/voice placeholder controls into `ReaderPlaybackPanel.svelte`. Keep `ReaderTtsWorkspace.svelte` responsible for mode summary and target/provenance cards only.

First slice constraints:

- rate UI may update route-local playback state but must not pretend to persist voice settings
- voice list can be a capability/unavailable panel if browser voices are not exposed yet
- next/previous can be disabled until queue segments exist

- [ ] **Step 3: Wire route state**

In `+page.svelte`, add route-local playback queue state derived from `effectiveTtsTarget`. Do not store it in route query params.

- [ ] **Step 4: Verify and commit**

Run:

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader tts workspace exposes mature playback controls in web mode"
git -C /Users/dev/workspace2/hc_apps/br1 diff --check
```

Commit with checklist and tutorial.

### P18 Annotation And Footnote Interaction Maturity

Target outcome: selection work becomes immediate and local to the text, not only a sidebar workflow. Footnotes and link previews become reader popups instead of forcing navigation or doing nothing visible.

#### Task 6: Add a selection-near annotation popup

**Files:**
- Create: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderAnnotationPopup.svelte`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderStage.svelte`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte`
- Modify: `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`
- Modify: `/Users/dev/workspace2/hc_apps/br1/.planning/READEST-ALIGNMENT-CHECKLIST.md`
- Add: `/Users/dev/workspace2/hc_apps/br1/tutorials/commit/0654-add-reader-annotation-popup.md`

- [ ] **Step 1: Write a focused smoke**

Add a Playwright smoke named:

```ts
test('reader shows selection-near annotation actions in web mode', async ({ page }) => {
  await page.goto('/reader?source=asset&url=%2Fsamples%2Fsample-book.txt&label=Sample%20TXT%20Book');
  await page.getByRole('button', { name: '打开笔记工作台' }).click();
  await page.evaluate(() => {
    const textNode = document.querySelector('.plain-text-reader')?.firstChild;
    if (!textNode) throw new Error('plain text reader missing');
    const range = document.createRange();
    range.setStart(textNode, 0);
    range.setEnd(textNode, Math.min(20, textNode.textContent?.length || 0));
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
  });
  await expect(page.getByRole('toolbar', { name: '选中文本操作' })).toBeVisible();
  await expect(page.getByRole('button', { name: '高亮' })).toBeVisible();
  await expect(page.getByRole('button', { name: '翻译' })).toBeVisible();
  await expect(page.getByRole('button', { name: '朗读' })).toBeVisible();
});
```

Expected before implementation: FAIL.

- [ ] **Step 2: Implement popup presentation only**

`ReaderAnnotationPopup.svelte` should accept:

- selected text summary
- supported/unsupported state
- actions for highlight, note, lookup, translate, TTS, copy

Keep actual action ownership in `+page.svelte` and existing note/assistance/TTS handlers. The popup is not a second annotation store.

- [ ] **Step 3: Mount and position conservatively**

For this slice:

- TXT can anchor near the reader stage selection rectangle.
- Foliate/EPUB can fall back to a fixed bottom-center popup if cross-iframe coordinates are not stable.
- PDF/CBZ should show unsupported copy instead of fake actions.

- [ ] **Step 4: Verify and commit**

Run:

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader shows selection-near annotation actions in web mode"
git -C /Users/dev/workspace2/hc_apps/br1 diff --check
```

Commit with checklist and tutorial.

#### Task 7: Add a reader footnote/link preview popup

**Files:**
- Create: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderFootnotePopup.svelte`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderStage.svelte`
- Modify: `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`
- Modify: `/Users/dev/workspace2/hc_apps/br1/.planning/READEST-ALIGNMENT-CHECKLIST.md`
- Add: `/Users/dev/workspace2/hc_apps/br1/tutorials/commit/0655-add-reader-footnote-popup.md`

- [ ] **Step 1: Add a fixture-backed smoke**

Add a small local fixture at `/Users/dev/workspace2/hc_apps/br1/static/samples/sample-footnote.epub` or generate it through the repo's existing fixture workflow if a helper already exists. Do not use network books or external downloads for this regression.

Smoke name:

```ts
test('reader opens footnote links in a reader popup in web mode', async ({ page }) => {
  await page.goto('/reader?source=asset&url=%2Fsamples%2Fsample-footnote.epub&label=Sample%20Footnote%20Book');
  await page.getByRole('link', { name: /footnote|注/i }).first().click();
  await expect(page.getByRole('dialog', { name: '脚注预览' })).toBeVisible();
  await expect(page.getByRole('button', { name: '关闭脚注' })).toBeVisible();
});
```

- [ ] **Step 2: Implement safe popup state**

`ReaderViewport.svelte` should intercept internal footnote-like links and emit a `footnoterequest` event containing:

- label
- href
- excerpt html/text if available
- fallback navigation target

If content extraction fails, show a popup with “无法预览，可跳转到正文位置” and a jump action.

- [ ] **Step 3: Verify and commit**

Run:

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader opens footnote links in a reader popup in web mode"
git -C /Users/dev/workspace2/hc_apps/br1 diff --check
```

Commit with checklist and tutorial.

### P19 Reader File Boundary Reduction

Target outcome: mature features do not make the reader files larger. This phase pays down the structural cost created by P16-P18 and keeps future refactors reviewable.

#### Task 8: Extract sidebar annotation presentation

**Files:**
- Create: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebarAnnotations.svelte`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte`
- Modify: `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`
- Modify: `/Users/dev/workspace2/hc_apps/br1/.planning/READEST-ALIGNMENT-CHECKLIST.md`
- Add: `/Users/dev/workspace2/hc_apps/br1/tutorials/commit/0656-extract-reader-sidebar-annotation-presentation.md`

- [ ] **Step 1: Capture baseline line counts**

Run:

```bash
wc -l /Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte
```

Record the baseline in the tutorial.

- [ ] **Step 2: Run existing annotation smokes**

Run:

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader supports txt notes through selection, persistence, and note reopen in web mode|reader productizes bookmarks as current reading positions in web mode"
```

Expected before refactor: PASS.

- [ ] **Step 3: Extract presentational sections**

Move only the notes/highlights/bookmark card rendering and local filter controls that do not own persistence into `ReaderSidebarAnnotations.svelte`. Keep mutation callbacks passed from `ReaderSidebar.svelte`.

Do not change:

- stored note/highlight schema
- KOReader metadata
- saved highlight selection import/export semantics
- route-owned notebook behavior

- [ ] **Step 4: Verify**

Run:

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader supports txt notes through selection, persistence, and note reopen in web mode|reader productizes bookmarks as current reading positions in web mode"
wc -l /Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte
git -C /Users/dev/workspace2/hc_apps/br1 diff --check
```

Expected: behavior passes and `ReaderSidebar.svelte` is materially smaller.

- [ ] **Step 5: Commit**

Commit with checklist and tutorial.

#### Task 9: Extract route coordination helpers for maturity surfaces

**Files:**
- Create or modify: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/route.ts`
- Create: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/maturityMode.ts`
- Create: `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/maturityMode.test.ts`
- Modify: `/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte`
- Modify: `/Users/dev/workspace2/hc_apps/br1/.planning/READEST-ALIGNMENT-CHECKLIST.md`
- Add: `/Users/dev/workspace2/hc_apps/br1/tutorials/commit/0657-extract-reader-maturity-route-coordination.md`

- [ ] **Step 1: Add helper tests**

Cover:

- inline translation route state never overrides dedicated translation route state
- annotation popup visibility clears when the book source changes
- footnote popup state clears when control nonce changes
- playback queue state resets when effective TTS target changes

- [ ] **Step 2: Move coordination decisions out of `+page.svelte`**

Extract pure functions from the new P16-P18 route code into `maturityMode.ts`. Keep Svelte navigation, localStorage, and event handlers in the route.

- [ ] **Step 3: Verify focused route ownership regressions**

Run:

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
cd /Users/dev/workspace2/hc_apps/br1 && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-maturity-mode-tests --noEmit false && node --test ./.tmp-maturity-mode-tests/src/lib/reader/maturityMode.test.js
pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader restores dedicated translation and tts modes from route state in web mode|reader exposes inline translation mode without replacing the notebook translation workspace|reader shows selection-near annotation actions in web mode"
wc -l /Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte
git -C /Users/dev/workspace2/hc_apps/br1 diff --check
```

Expected: route remains materially smaller than it would be if P16-P18 logic stayed inline.

- [ ] **Step 4: Commit**

Commit with checklist and tutorial.

## Final Verification

After all tasks land, run:

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader exposes inline translation mode without replacing the notebook translation workspace|reader tts workspace exposes mature playback controls in web mode|reader shows selection-near annotation actions in web mode|reader opens footnote links in a reader popup in web mode|reader supports txt notes through selection, persistence, and note reopen in web mode|reader can open tts mode as a dedicated notebook tab"
git -C /Users/dev/workspace2/hc_apps/br1 diff --check
git -C /Users/dev/workspace2/hc_apps/br1 status --short
```

Expected:

- `pnpm check` PASS
- focused e2e grep PASS
- `git diff --check` no output
- only unrelated pre-existing untracked plan files may remain untracked

## Execution Notes

- Prefer `Subagent-Driven` execution for this plan. The tasks are mostly separable by ownership boundary.
- Execute P16 before P17/P18 because inline translation candidates and reading-source ownership affect translated TTS and popup actions.
- Execute P19 after P16-P18 because it extracts the real seams created by the maturity work rather than guessing abstractions first.
- If any task causes the reader route to grow substantially, stop and extract a helper before committing.
- If a Readest feature depends on unsupported renderer internals, ship a visible capability boundary instead of faking parity.
