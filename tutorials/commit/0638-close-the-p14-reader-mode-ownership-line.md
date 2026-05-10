# Close the P14 reader mode ownership line

## Why

`P14` 开始时的目标很窄：把 dedicated `翻译模式 / 朗读模式` 的 current-book ownership 从脆弱的 live session toggle 收成可信的 same-book restore 状态。

现在这条线上已经陆续补齐了：

- translation ownership
- TTS ownership
- TTS read-aloud mode
- translated TTS live/archive owner
- live translated TTS body
- live translation body
- per-book translation config
- archived translation provenance

继续把 payload-heavy deep-link state 或跨书 archive browsing 也塞进 `P14`，会让这条线从 “same-book ownership persistence” 变成另一种主线。

## What changed

- 在 checklist 里正式把 `P14` 标成已闭合的 current-book ownership persistence line。
- 明确写清 `P14` 已经覆盖的 reader state 范围：ownership、mode、same-book config、live bodies、archived provenance。
- 明确写清不继续留在 `P14` 里的剩余方向：payload-heavy deep-link state、cross-book archive/replay、以及更广义的 workspace shell persistence。

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- 这刀不再新增 reader runtime 或 UI 行为。
- 这刀不把 pinned payload text、cross-book archive browsing、或新的 route contract 重新包装成 `P14` 微切片。
