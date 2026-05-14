# 0644 - Guard Stale Active TTS Translation

## 背景

Task 3 把 TTS ownership 抽到了 `ttsOwnership.ts`，但 active translation 分支少了一个关键保护：只要 assistance state 是 `ready`，就会接受当前 result，没有先确认 `activeRequest.text` 仍然等于当前翻译来源。

这会在读者移动到新段落后，把旧段落的译文当成新段落的译文朗读，并可能进一步保存成新的 translated TTS live snapshot。

## 主要目标

- 让 translated TTS 只接受 source text 匹配当前翻译来源的 active translation result。
- 增加行为测试，确认 stale active translation 不会生成 translated TTS target，也不会生成可持久化的 live snapshot。

## 改动概览

- 在 `resolveReaderLiveTranslatedTtsResult` 的 active assistance 分支增加 `activeRequest.text` 与当前 normalized source 的相等检查。
- 新增 `stale ready active translation is not used or persisted for translated tts` 测试。
- 修正 archive source label 的测试期望：当 provider label 已含 `译文` 时，TTS target 不会追加 `翻译结果`。

## 关键知识

- Active result 和 current source 是两个独立状态。异步翻译完成时，读者可能已经移动到另一个段落，因此必须用 source text 做归属校验。
- Snapshot 更新前要先拒绝 stale result，否则旧译文会被包装成新 source 的 snapshot，后续 reload 会继续复用错误内容。

## 验证

- `./node_modules/.pnpm/node_modules/.bin/tsx --test ./src/lib/reader/ttsOwnership.test.ts`：PASS，6 tests passed。
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`：PASS，`svelte-check found 0 errors and 0 warnings`。
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader restores dedicated tts ownership for the same book across reload|reader restores dedicated tts read-aloud mode per book across reload|reader preserves live translated tts ownership over archive selection across reload|reader restores live translated tts snapshot over archive selection across reload"`：PASS，3 matched tests passed。

## 未覆盖项

- 未实现 Task 4 workspace mode resolution。
- `reader preserves live translated tts ownership over archive selection across reload` 当前仍没有匹配的 Playwright 测试标题。
