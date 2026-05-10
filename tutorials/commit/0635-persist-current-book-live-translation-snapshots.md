# Persist current-book live translation snapshots

## Why

`P14-1.5` 已经让 live-owner 的 translated TTS 能在同一本书里恢复最近一次 live 译文 body，但 dedicated `翻译模式` 自己还差同一层恢复能力。

在 reload 之后，`assistanceState` 会重新变空；如果这时也没有还能按 source text 精确匹配的 ready translation history，当前书的 `翻译模式` 就会把刚才已经建立好的 live 译文结果丢掉，退回空态。

## What changed

- 给 dedicated `翻译模式` 增加 current-book `live translation snapshot` 持久化，记录最近一次可用的 live 译文 body 和它对应的 source/provenance。
- dedicated `翻译模式` 的 live result 恢复顺序现在变成：当前 live `assistanceState` -> 同书精确匹配 history -> persisted live snapshot。
- snapshot 只会在当前翻译来源 text 仍然精确匹配时复用，避免把旧译文 body 绑定到新的 pinned/follow source 上。
- 清空当前书 translation history 时，也会一起清掉这条 live snapshot，避免之后 reload 又恢复到已经被用户明确清掉的结果。
- 补 focused smoke：先证明 dedicated `翻译模式` 显示 live 译文，再删掉可重建它的 matching history，reload 后确认同一本书仍然保留 live result，而不是掉空或切进历史记录语义。

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader restores live translation snapshots for the same book across reload|reader restores dedicated translation ownership for the same book across reload"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- 这刀不把 live translation payload text 抬成 route-owned deep-link state。
- 这刀只保留当前书最近一次 live translation result snapshot，不扩成跨书 archive/replay 体系。
