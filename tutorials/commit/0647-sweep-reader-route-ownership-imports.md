# 0647 Sweep Reader Route Ownership Imports

## 背景

Task 1 到 Task 4 已经把 current-book persistence、translation ownership、TTS ownership 和 workspace mode 从 reader route 中拆到了 `src/lib/reader/` 的专门 helper。Task 5 是最后一次 route sweep：不新增阅读行为，只让 `src/routes/reader/+page.svelte` 更像协调层。

## 主要目标

- 删除 extraction 后已经变成一层转发的 route-local persistence helper。
- 把 reader route 的 import 按 ownership family 分组，方便新人快速看到哪些逻辑已经移出 route。
- 确认 route 已经显著小于原始 3073 行，并且不再手写 current-book JSON parse/persist helper。

## 改动概览

- 将 route import 分成 route composition、current-book persistence、translation ownership、TTS ownership、workspace mode 五组。
- 删除 assistance、translation ownership、translation live snapshot、translation mode config 的 route-local persist/restore wrapper。
- 在 book switch、reactive persistence 和 clear-history 分支中直接调用 `currentBookPersistence` 导出的 typed helper。

## 关键知识

- Svelte route 适合作为 state coordination boundary，但不适合长期保存 parse/serialize 细节。把 JSON payload 规则放进纯 TypeScript helper 后，route 只需要传入当前 storage key 和当前状态。
- “显式 helper”不总是更清晰：如果一个 route-local function 只是把参数原样转交给已提取 helper，它会隐藏真正的 ownership seam。直接调用提取后的 helper 反而更容易审计数据从哪里恢复、在哪里持久化。

## 验证

- `wc -l src/routes/reader/+page.svelte` PASS，2501 lines，低于原始 3073 lines。
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` PASS，0 errors and 0 warnings。
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader restores dedicated translation ownership for the same book across reload|reader restores dedicated tts ownership for the same book across reload|reader restores live translation snapshots for the same book across reload|reader preserves live translated tts ownership over archive selection across reload|reader restores dedicated translation and tts modes from route state in web mode|reader can jump from translation mode into translated tts in web mode"` PASS，6 passed。`01de90e` 已将 live translated TTS 覆盖的测试标题对齐到该 grep 分支，所以现在 6 个目标测试都会运行。
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` PASS。

## 未覆盖项

- 没有修改 backend/Rust、reader visual structure 或新的 reader 行为。
- 没有补新 E2E；本次是 route cleanup sweep，沿用现有 ownership restore smoke coverage。
