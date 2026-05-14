# 0641 Extract Reader Translation Ownership State

## 背景

Reader 路由里的翻译模式同时处理当前阅读位置、锁定翻译源、当前书恢复、URL 显式参数、历史翻译归档和 live snapshot。继续把这些分支留在 `+page.svelte` 里，会让后续 TTS ownership 和 workspace mode 拆分更难审计。

## 主要目标

把翻译 ownership 的纯规则移到 `src/lib/reader/translationOwnership.ts`，让路由只负责从 Svelte reactive blocks 传入当前状态并接收决策结果。

## 改动概览

- 新增 `translationOwnership.ts`，集中处理 follow-current vs pinned source、source normalization、live translation panel result、live snapshot state、route/archive/current-book config fallback。
- 新增 `translationOwnership.test.ts`，覆盖 pinned source 优先级、route archive 显式优先级、live snapshot source match、archive provenance 恢复 provider/language。
- 更新 `src/routes/reader/+page.svelte`，用 helper 替换翻译源、live snapshot、panel result、route/archive provider/language fallback 的 inline 分支。
- 更新 `src/lib/reader/index.ts`，导出新的 helper 和类型。

## 关键知识

- URL route state 是显式用户意图，优先级高于 current-book ambient restore；但只有 route 真的带 archive id 时，route-owned archive 才应该压过本书上次选择的 archive。
- Live translation snapshot 只能在 `sourceText` 与当前翻译源完全匹配时复用，否则旧段落的译文可能被展示到新段落下面。
- Svelte route 文件适合做状态接线，但跨 localStorage、URL、history、live state 的优先级规则应放进纯 TypeScript helper，这样可以用 Node test 直接锁住行为。

## 验证

- `./node_modules/.pnpm/node_modules/.bin/tsx --test ./src/lib/reader/translationOwnership.test.ts`（PASS）
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`（PASS）
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader restores live translation snapshots for the same book across reload|reader restores current-book archived translation provenance across reload|reader restores dedicated translation mode config per book across reload"`（PASS）

## 未覆盖项

- TTS ownership 仍留在 `+page.svelte`，按计划留给 Task 3。
- Workspace mode resolution 仍留在 `+page.svelte`，按计划留给 Task 4。
