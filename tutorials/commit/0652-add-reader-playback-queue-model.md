# 0652 Add Reader Playback Queue Model

## 背景

`br1` 的 TTS 已经有 dedicated `朗读模式`、mini bar 和跨模式 ownership，但还没有一个纯 helper 去描述“当前朗读目标如何拆成播放队列、怎么做上一段/下一段、朗读速度怎么限幅、定时关闭何时自动失效”。Task 5 需要把这些控制挂到 UI 上，所以先补一个可测试的 queue model，避免在 route 或 workspace 里临时发明状态。

## 主要目标

- 先建立纯 TypeScript playback helper，不改 `+page.svelte`、`ReaderTtsWorkspace.svelte` 或任何播放面板 UI。
- 直接复用 `ReaderTtsSpeechTarget` 作为 segment 的正文/标签来源，避免再造一套并行的 TTS target contract。
- 把最容易悄悄回归的边界先钉死：起始段、边界夹紧、rate 限幅、timeout 过期自动失效、空队列摘要。

## 改动概览

- 新增 `src/lib/reader/playbackQueue.ts`，提供 `createReaderPlaybackQueue`、前后移动、rate/timeout 设置和摘要 helper。
- 新增 `src/lib/reader/playbackQueue.test.ts`，覆盖 Task 4 要求的 5 个纯 helper 行为。
- 在 `src/lib/reader/types.ts` 中增加 `ReaderPlaybackSegment`、`ReaderPlaybackQueueState` 和 `ReaderPlaybackQueueSummary`。
- 从 `src/lib/reader/index.ts` 导出 playback queue helper 和相关类型。
- 更新 `package.json` 里的 `test:reader-helpers`，把新的纯 helper test 纳入现有 helper 验证入口。

## 关键知识

- `ReaderPlaybackSegment` 不重新定义正文 payload，而是持有一个已经规范化的 `ReaderTtsSpeechTarget`。这样后续播放面板、route state 和 mini bar 可以继续围绕同一个 TTS target 语义工作。
- timeout helper 既负责“设置定时关闭”，也负责在后续读取/更新时把过期 timer 自动清空。这样 UI 不需要自己维护一套额外的“是否已经超时”判断。
- rate helper 固定把速度夹在 `0.2x` 到 `3.0x`，保证后续 UI slider 或快捷按钮不会把 runtime 推进未约束的范围。

## 验证

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` PASS，0 errors and 0 warnings。
- `cd /Users/dev/workspace2/hc_apps/br1 && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-playback-queue-tests --noEmit false && node --test ./.tmp-playback-queue-tests/src/lib/reader/playbackQueue.test.js` PASS，5 tests passed。
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 test:reader-helpers` PASS，inline translation / playback queue / reading mode helper tests all passed。
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` PASS。

## 未覆盖项

- 没有修改任何 reader route state、TTS workspace 或 playback panel UI。
- 没有接入 voice list、真实 runtime rate 调整或播放控制按钮。
- 没有做段落切分策略优化；当前 queue helper 只接受上层已经决定好的 `ReaderTtsSpeechTarget` 列表。
