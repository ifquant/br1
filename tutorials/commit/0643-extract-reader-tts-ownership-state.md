# 0643 - Extract Reader TTS Ownership State

## 背景

Reader 路由已经开始把“当前图书持久化”和“翻译 ownership”拆到纯 TypeScript helper 里，但 TTS 仍然在 `+page.svelte` 中同时处理持久化恢复、跟随当前/锁定目标、原文/译文朗读、 live 译文快照、历史译文来源和 mini-bar 摘要。

这些逻辑互相影响：例如译文朗读既可能来自当前 live 翻译，也可能来自选中的历史翻译；mini-bar 在译文尚未生成时还要显示稳定的等待来源。把它们留在 route 中会让后续 workspace mode 拆分继续变复杂。

## 主要目标

- 新增 `ttsOwnership.ts`，让 TTS ownership 的恢复、译文来源选择、live snapshot 复用和 mini-bar 摘要成为可测试的纯函数。
- 新增 `ttsOwnership.test.ts`，覆盖跟随/锁定恢复、每书朗读模式、live snapshot 优先、历史译文 owner 和等待态摘要。
- 让 `src/routes/reader/+page.svelte` 只负责把 Svelte 状态传给 helper，而不再手写这些分支。

## 改动概览

- 新增 `restoreReaderTtsOwnershipState` / `persistReaderTtsOwnershipState`，复用 `currentBookPersistence.ts` 中已有的 JSON 解析与清理规则。
- 新增 `resolveReaderTtsSpeechTarget`、`resolveReaderEffectiveTtsTarget`、`resolveReaderTranslatedTtsSourceState` 和 translated live snapshot helper。
- 将 mini-bar 的 translated waiting label、location summary、context summary 和 visibility 判断收敛到 TTS ownership helper。
- 通过 `src/lib/reader/index.ts` 导出新的 helper surface。

## 关键知识

- TTS owner 不是单个布尔值。它同时由当前阅读位置、锁定朗读目标、原文/译文模式、选中历史译文和 live 译文快照共同决定，所以 helper 输入必须显式传入这些状态，避免从 route 或浏览器环境里隐式读取。
- live translated snapshot 只能在 `sourceText` 仍然匹配当前翻译来源时复用。否则旧段落的译文可能在 mini-bar 或朗读目标里伪装成新段落的译文。
- route 参数只应该覆盖它明确拥有的决策。`workspace=translation` 可以把 translated TTS owner 切到 live/archive；`workspace=tts&tts=translated&ta=...` 可以强制 archive；普通 TTS route 不应该无故覆盖当前 owner。

## 验证

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`：PASS，`svelte-check found 0 errors and 0 warnings`。
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader restores dedicated tts ownership for the same book across reload|reader restores dedicated tts read-aloud mode per book across reload|reader preserves live translated tts ownership over archive selection across reload|reader restores live translated tts snapshot over archive selection across reload"`：PASS，3 matched tests passed.

## 未覆盖项

- 未实现 Task 4 的 workspace mode resolution 拆分。
- 上面的 Playwright grep 中 `reader preserves live translated tts ownership over archive selection across reload` 当前没有匹配的测试标题，因此本次实际运行了 3 个匹配用例。
