# 0497: wire Web Speech TTS with safe fallback text

这次把 `br1` 的 TTS 从“有状态但不出声”推进到“在支持的浏览器里真的能读”。它仍然保持很保守：优先朗读当前选中文本，只有没有选区时才退到章节标题或书名，不做大范围的 DOM/foliate 文本抽取。

## 背景

`0496` 已经把朗读按钮背后的状态机立起来了，但那一版还没有接真正的语音引擎。这个 slice 的目标就是把 Web Speech `speechSynthesis` 接进来，同时保留 `unavailable / idle / speaking / paused / error` 这套会话状态。

## 主要目标

- 支持的平台可以调用 `speechSynthesis.speak(...)`
- 不支持的平台要明确显示为不可用，而不是悄悄失败
- 暂停、继续、停止要分别映射到 `pause / resume / cancel`
- 朗读结束或出错后，要把状态收回到 `idle` 或 `error`
- 没有选中文本时，只使用章节标题或书名做安全回退

## 改动概览

- 新增了一个很小的浏览器运行时封装，把 Web Speech 的支持检测、`speak`、`pause`、`resume`、`stop` 集中起来
- `src/lib/reader/tts.ts` 继续负责会话模型，但现在会真的驱动浏览器朗读
- `src/routes/reader/+page.svelte` 先取 `$notesState.selection?.text`，没有选区时再退到 `currentPreview.chapterLabel` 或 `currentPreview.title`
- `ReaderHeaderBar` 现在会把安全回退路径写进按钮文案和状态提示里，避免看起来像“完整正文抽取”
- 清单里的 `P1-2.2` 也同步打勾，并记录这次只覆盖 Web Speech v1

## 关键知识

1. **浏览器 API 要延迟到客户端再碰。** 这里没有在模块加载时直接访问 `window`，而是把支持检测放进运行时创建函数里，并在 `onMount` 之后刷新可用性。这样 SSR 不会报错，也不会在服务端制造副作用。
2. **状态机和副作用最好分层。** `tts.ts` 仍然是会话模型，但它不再假装“不可用”。真正的语音播放由一个小运行时负责，状态层只管把 `idle / speaking / paused / error` 这些状态收口。这样以后如果要换成系统 TTS 或 Tauri 插件，外层 UI 基本不用重写。

## 验证

- `pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec check`
- `git -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec diff --check`

## 未覆盖项

- 没有接 Edge TTS 或任何网络语音服务
- 没有做全文段落抽取，只使用选中文本或保守 fallback
- 没有补桌面 e2e 朗读回归，这一版先靠类型检查和 diff 检查收口
