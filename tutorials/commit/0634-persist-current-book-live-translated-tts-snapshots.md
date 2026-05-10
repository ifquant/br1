# Persist current-book live translated TTS snapshots

## Why

`P14-1.4` 已经让 translated TTS 的 `archive / live` owner 可以按当前书恢复，但 live-owner 还差最后一层：如果 reload 之后已经没有 live `assistanceState`，而且也没有还能按 source text 精确重建的 ready translation history，translated TTS 仍然会丢掉当前译文 body。

这会让同一本书里已经建立好的 live translated playback 在 reload 后回不到之前的译文内容，即使 owner 和 source ownership 都还在。

## What changed

- 给 dedicated translated TTS 增加 current-book `live translated snapshot` 持久化，记录最近一次可用的 live translated body 和它对应的 source/provenance/位置摘要。
- translated TTS 在 `owner=live` 时，恢复顺序现在变成：当前 live result -> 同书精确匹配 history -> persisted live snapshot。
- snapshot 只在 source text 仍然匹配当前翻译来源时才会复用，避免把旧译文 body 错绑到新的 live source 上。
- 切到 archive owner 时会清掉 live snapshot，避免同一本书后续 reload 时被旧 live body 污染。
- 补 focused smoke：保留 archive path 不回归，同时验证 live translated body 在删掉 live history 后 reload 仍能恢复，而且不会被 lingering archive selection 抢走。

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader lets translated tts mode consume the selected translation archive in web mode|reader restores live translated tts snapshot over archive selection across reload"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- 这刀不把 translated payload text 抬成 route-owned deep-link state。
- 这刀只保留当前书最近一次 live translated playback snapshot，不扩成跨书 archive/replay 体系。
