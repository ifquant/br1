# Persist current-book translation mode config

## Why

`P13` 已经让 dedicated `翻译模式` 的 `tl` / `tp` 可以被 route 显式覆盖，但在没有 route override 的日常阅读里，这两个设置仍然不是当前书状态。

结果是：同一本书 reload 后会掉回默认的 `中文 / DeepL`，而如果刚好前一本书改成了 `English / Yandex`，下一本书又可能继续带着这组选择开始阅读。

## What changed

- 给 dedicated `翻译模式` 增加 current-book `target language + provider` 持久化。
- 同一本书 reload 后，现在会恢复上次的翻译目标语言和 provider。
- 换一本到没有保存过 config 的书时，会继续回到默认 `中文 / DeepL`，不继承前一本书的翻译模式配置。
- 现有 route-owned `workspace=translation&tl=...&tp=...` 仍然优先于 current-book local state，没有被这刀回退成更弱的 restore 语义。
- 补 focused smoke，同时锁住 `same-book restore`、`cross-book isolation`、`route-state target language`、`route-state provider` 四条合同。

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader restores dedicated translation mode config per book across reload|reader restores dedicated translation ownership for the same book across reload|reader restores dedicated translation target language from route state in web mode|reader restores dedicated translation provider from route state in web mode"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## Not included

- 这刀不把 pinned translation payload text 抬成 route-owned deep-link state。
- 这刀只覆盖 current-book 的 target language / provider，不扩成跨书共享的 translation profile 系统。
