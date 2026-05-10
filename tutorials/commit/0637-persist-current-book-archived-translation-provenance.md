# Persist current-book archived translation provenance

## Why

`P14-1.7` 已经让 dedicated `翻译模式` 的 target language / provider 会按当前书恢复，但还有一个 provenance 缺口：如果同一本书恢复的是一条已选中的历史译文记录，而 route 又没有显式给 `ta/tl/tp`，页面虽然会回到那条 archived body，本地的 `中文 / DeepL` 或 `English / Yandex` 配置却可能还是另一套。

这会让 dedicated `翻译模式` 在 reload 后出现“正文是这条历史译文，但顶部配置看起来像另一条 live mode 配置”的错位。

## What changed

- 在 current-book restore 阶段，如果同一本书已经恢复了 `selected translation archive`，并且 route 没有显式拥有 `ta/tl/tp`，dedicated `翻译模式` 现在会把 target language / provider 一起对齐到这条历史记录自己的 provenance。
- 这条恢复只发生在当前书 restore 边界，不会持续压过后续用户手动切换的 `中文 / English` 或 `DeepL / Yandex`。
- route-owned `workspace=translation&ta=...&tl=...&tp=...` 仍然优先；这刀只补 current-book local restore，而不是削弱 `P13` 的 route contract。
- 补 focused smoke：先用一条 archived translation 覆盖本地 config，再验证 same-book reload 后会回到这条 archived provenance；同时保留既有 route-state 和 per-book config smoke，防止互相打穿。

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader restores current-book archived translation provenance across reload|reader restores dedicated translation archive selection from route state in web mode|reader restores dedicated translation mode config per book across reload|reader restores dedicated translation target language from route state in web mode|reader restores dedicated translation provider from route state in web mode"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- 这刀不把 archived translation selection 抬成新的 route-owned deep-link payload。
- 这刀只覆盖 same-book restore 时的 archived provenance 对齐，不扩成跨书 archive browsing 或 replay 系统。
