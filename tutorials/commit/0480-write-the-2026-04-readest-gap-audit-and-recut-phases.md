# 0480 - 写入 2026-04 Readest 差距审计并重切 phases

这一刀不是继续做实现，而是修 planning reality。

前面一整轮 route-closure push 已经把 `library/+page.svelte` 从“大对象装配器”收到了更像真正 page host 的边界。但如果继续沿这条线往下推，很容易出现一个错觉：

- 代码结构越来越干净
- 但产品上离 `Readest` 的真实差距却没有变小

这次文档更新就是为了把这个判断正式写进仓库。

## 这刀做了什么

1. 新增 [`/.planning/READEST-GAP-AUDIT-2026-04.md`](/Users/dev/workspace2/hc_apps/br1/.planning/READEST-GAP-AUDIT-2026-04.md)

   这份文档直接回答：

   - 当前 `br1` 和公开的 `Readest` 产品面相比，真正还差什么
   - 为什么 route-closure 现在只能算内部维护线
   - 为什么后续主计划应该转向 `P1 / P2`

   重点结论是：

   - `br1` 现在是 `core-reader strong, advanced/service weak`
   - 真正的缺口主要在：
     - `Dictionary / Wikipedia`
     - `Parallel Read`
     - `TTS`
     - `Visual & Focus Aids`
     - `OPDS / Calibre`
     - `DeepL / Yandex`
     - `Cross-device Sync`
     - `KOReader Sync`

2. 更新 [`/.planning/ROADMAP.md`](/Users/dev/workspace2/hc_apps/br1/.planning/ROADMAP.md)

   之前 roadmap 里：

   - `P1` 和 `P2` 只是 frozen boundary

   现在改成：

   - `P1-1 Lookup and In-Reading Assistance`
   - `P1-2 Read Aloud, Focus, and Accessibility`
   - `P1-3 Parallel and Specialized Reading Surfaces`
   - `P2-1 Catalog Connectors`
   - `P2-2 Translation Bridges`
   - `P2-3 Cross-Device Sync Substrate`
   - `P2-4 Ecosystem Adapters`

   也就是不再把高级阅读体验和服务生态当成“以后再说”的模糊边界，而是拆成真正可执行的 phases。

3. 更新 [`/.planning/STATE.md`](/Users/dev/workspace2/hc_apps/br1/.planning/STATE.md)

   让当前状态与新判断一致：

   - `P1/P2` 不再永久冻结
   - route-closure 不再是主执行线
   - `P0 exit audit -> P1-1 -> P1-2` 成为新的建议动作链

4. 更新 [`/.planning/FEATURE-PARITY-AUDIT.md`](/Users/dev/workspace2/hc_apps/br1/.planning/FEATURE-PARITY-AUDIT.md)

   不是重写证据链，而是补一层更明确的 planning consequence：

   - 现在最大的差距不再是 route 结构
   - 下一条真正应该推进的产品线是 `P1-1`

## 为什么这刀重要

很多时候，代码结构收口会带来一种“项目快做完了”的错觉。

但对 `br1` 来说，这已经不对了。

这次 route-closure push 的意义是：

- 把 page host 的机械装配层收干净
- 让后续实现 `P1/P2` 时，不需要继续踩同样的结构泥坑

它不代表：

- `Readest` 差距已经主要关闭
- 后续还该继续把主要精力放在 route 内部结构上

如果不把这层判断写进仓库，后面很容易继续沿着“内部越来越整洁”这条线惯性推进，却越来越偏离真正的 parity 主矛盾。

## 新的执行顺序

仓库现在正式记录的建议顺序是：

1. 继续完成 `P0-1` 到 `P0-4`
2. 做一次 `P0 exit audit`
3. 进入 `P1-1 Lookup and In-Reading Assistance`
4. 再做 `P1-2 Read Aloud, Focus, and Accessibility`
5. 然后才进入 `P1-3` 与 `P2-*`

这比“无限继续做 route-closure”更符合当前真实产品差距。

## 验证

- `pnpm check`
- `git diff --check`

## 结果

这一刀之后，仓库里已经正式记录：

- 为什么 route-closure 不再是主执行线
- `br1` 相对 Readest 的真实缺口主要在哪
- 后续 phase 应该怎么切，而不是继续把 `P1/P2` 冻结成模糊边界
