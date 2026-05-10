# Persist current-book translated TTS owner across reload

## Why

`朗读模式` 已经能按当前书恢复 `follow-current / locked target` 和 `朗读原文 / 朗读译文`，但 translated playback 仍然缺一层更细的 owner 恢复：同一本书里，如果既有 `历史译文` 选择，又有当前阅读来源对应的 live translation context，reload 之后会默认掉回 archive-backed playback。

这会把 `当前译文` 和 `历史译文` 两条 provenance 混在一起，让同书 reload 后的 translated TTS 行为不可预测。

## What changed

- 给 dedicated translated TTS 增加 current-book `translated owner` 持久化，区分 `archive` 和 `live` 两条 provenance。
- `朗读模式` 的 translated target 现在显式订阅 `translatedTtsOwner` 和当前 translation source，owner 变化后会真正重算 target，不再只改文案。
- `翻译模式 -> 朗读模式` 的跳转现在按当前 provenance 打开 translated TTS：route-owned archive selection 继续走 `历史译文`，没有 `ta` 的 dedicated translation mode 则保持 live-owner 语义。
- live-owner path 不再静默回退成 `历史译文`。同一本书 reload 后，已经建立的 live-owner 会继续保持“不是 archive-backed playback”这条合同。
- 补 focused smokes，分别锁住 archive-backed translated playback 和 live-owner translated playback across reload。

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader lets translated tts mode consume the selected translation archive in web mode|reader preserves live translated tts ownership over archive selection across reload"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- 这刀不把 pinned translation / translated TTS payload text 抬成 route-owned deep-link state。
- 这刀也不保证仅凭 source ownership 就一定能重建 live translated body；它先收 owner persistence 和“不静默降级成 archive”这条行为合同。
