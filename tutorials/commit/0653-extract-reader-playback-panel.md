# 0653 Extract Reader Playback Panel

## 背景

Task 4 已经把播放队列、速度限幅和定时关闭变成了纯 helper，但 `ReaderTtsWorkspace.svelte` 还同时背着模式摘要、目标/来源卡片和一整组播放控制。Task 5 要把 dedicated TTS 往更成熟的阅读播放面板推进，所以这一步要先把成熟播放控制抽出来，并明确这些控制是 route-local 状态，不是新的持久化设置。

## 这次改了什么

- 新增 `src/lib/components/reader/ReaderPlaybackPanel.svelte`，承接 dedicated TTS 的播放动作、rate slider、定时关闭，以及单段队列下的播放摘要和浏览器语音能力说明。
- 缩小 `src/lib/components/reader/ReaderTtsWorkspace.svelte` 的职责，只保留 `朗读模式` 摘要条和目标/来源/位置/会话卡片。
- 在 `src/routes/reader/+page.svelte` 里新增 route-local playback queue state，直接用 `src/lib/reader/playbackQueue.ts` 从当前 `effectiveTtsTarget` 派生，不把这组状态写进 URL query。
- 通过 `ReaderNotebook.svelte` 把新的 playback summary 和回调继续往下传，避免在 workspace 内再次发明一套 queue model。
- 在 `tests/e2e/library-smoke.spec.ts` 里增加 `reader tts workspace exposes mature playback controls in web mode`，锁定 `播放控制` 区域、速度 slider、单段队列占位文案和 `定时关闭` 按钮。

## 关键边界

- 当前 queue 还是单段派生：它先证明 route 和 panel 的 ownership 是对的，不在这一刀里引入章节切段策略，所以面板只显示当前片段摘要，不假装已经支持上下段导航。
- rate slider 只更新当前 reader route 的 playback state。现在的 Web Speech runtime 还没有消费这组 rate 值，所以 UI 文案必须明确它不是持久化设置，也不是已经生效的引擎参数。
- 语音区现在只报告“浏览器有没有暴露 voice list”。如果没有可用列表，就展示 capability copy，而不是假装支持语音切换。

## 验证

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` PASS。
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader tts workspace exposes mature playback controls in web mode"` PASS。
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` PASS。

## 未覆盖项

- 还没有做真正的多段播放队列生成，也还没有把正文分段策略接进 route-local queue。
- 还没有把 panel 的 rate/voice 选择接进 Web Speech runtime。
- 还没有做 media session、自动播下一段或更丰富的定时关闭预设。
