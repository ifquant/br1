## Why

The last slice added `刷新全部跨书映射`, which made foreign-book remap maintenance scalable. But the feedback surface was still too blunt: after a bulk refresh, the reader only showed a total-count notice like `已刷新 1 组跨书选择集`.

That was not enough to judge the result quality. A serious foreign-book management surface needs to say which imported sets are:

- fully matched
- partially matched
- completely missed

This commit adds the first structured refresh-result summary for that purpose.

## What changed

### 1. Add explicit refresh summary state

In [`src/lib/components/reader/ReaderSidebar.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte), the highlights workspace now tracks:

- `refreshedCount`
- `fullMatches`
- `partialMatches`
- `missedMatches`

This state is populated by both:

- single-set `刷新映射`
- bulk `刷新全部跨书映射`

So the refresh result is no longer trapped inside a single-line notice.

### 2. Classify foreign-book refresh outcomes

The refresh code now explicitly buckets each imported foreign-book saved set:

- `matched == total` → full
- `matched == 0` → missed
- otherwise → partial

That classification is used for:

- per-set refresh summary
- bulk refresh summary

The summary is rendered as a dedicated UI section instead of requiring the user to infer quality from card text or raw counts.

### 3. Add a visible refresh summary block

The saved-set workspace now renders a structured `刷新结果` section that can show:

- `共处理 N 组跨书选择集`
- `完全匹配：...`
- `部分匹配：...`
- `未匹配：...`

This is the first time cross-book refreshes have a dedicated qualitative result surface, not just a command acknowledgment.

### 4. Lock the partial-match case in web and desktop

The highest-value flows now assert the new structured summary:

- [`tests/e2e/library-smoke.spec.ts`](/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts)
  - `TXT web`
  - after bulk refresh, it now checks:
    - `共处理 1 组跨书选择集`
    - `部分匹配：Web TXT 重命名高亮（1/2）`

- [`e2e/app.e2e.ts`](/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts)
  - `EPUB desktop`
  - asserts the same structured partial-match summary in the real reader flow

## Verification

- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts --reporter=line`
- `bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'persists epub highlights and notes separately through the desktop reader store' --mochaOpts.timeout 180000"`
- `pnpm check`
- `git diff --check`

## Not included

- The refresh summary is still ephemeral workspace state; it is not yet preserved across reopen.
- Secondary-format desktop regressions do not yet assert the new structured refresh summary.
