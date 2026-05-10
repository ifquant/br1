# Persist current-book TTS read-aloud mode

## Why

`朗读模式` 已经能恢复当前书的 `follow-current / locked target` ownership，但 `朗读原文 / 朗读译文` 仍然挂在全局 reader setting 上。结果是一本书切到 `朗读译文` 以后，另一册书也会被动继承这个 mode，即使它没有同样的翻译上下文。

## What changed

- 给 dedicated `朗读模式` 增加 current-book `ttsReadAloudTextMode` 持久化，并在切书时按 `readerBookKey` 恢复。
- 同一本书 reload 后会回到上次的 `朗读原文 / 朗读译文`；另一册没有保存过 mode 的书不会继承前一本书的 translated playback。
- 保留 `workspace=tts&tts=...` 的 route-owned override；但当 notebook 已收起时，mini-bar 切 mode 不再把 `workspace=tts` 写回 URL 并重新弹开工作台。
- 补 focused smoke，锁住同书 reload restore、跨书不继承，以及相邻 route-state / dedicated TTS 合同不回归。

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader restores dedicated tts read-aloud mode from route state in web mode|reader can open tts mode as a dedicated notebook tab|reader restores dedicated tts read-aloud mode per book across reload"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- pinned TTS payload text 仍然不是 route-owned deep-link state。
- 这刀不扩 translated-TTS 的 archive/live provenance 模型，只收 `原文 / 译文` mode 本身的 current-book ownership。
