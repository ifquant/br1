# 0484 - 认证 P0 多格式与可信打开覆盖

这一刀把 Readest 对齐里的 P0-1.1 / P0-1.2 收口到了可见证据：

- [`tests/e2e/library-smoke.spec.ts`](/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts)
- [`.planning/READEST-ALIGNMENT-CHECKLIST.md`](/Users/dev/workspace2/hc_apps/br1/.planning/READEST-ALIGNMENT-CHECKLIST.md)

## 这刀做了什么

1. 扩展了 web smoke 的格式矩阵

   `library-smoke.spec.ts` 现在覆盖 7 个样例资产：

   - `sample-book.epub`
   - `sample-outline.pdf`
   - `sample-book.fb2`
   - `sample-book.mobi`
   - `sample-book.azw3`
   - `sample-comic.cbz`
   - `sample-book.txt`

   每个样例都会：

   - 打开 reader
   - 确认 `reader stage` 可见
   - 确认页脚里能看到对应格式
   - `reload()` 后再次确认仍然打开

2. 把 P0 状态打回 checklist

   `.planning/READEST-ALIGNMENT-CHECKLIST.md` 里：

   - `P0-1.1` 已标记完成
   - `P0-1.2` 也标记完成，并注明可信打开的桌面证据已经存在于 `e2e/app.e2e.ts`

## 为什么这刀重要

P0 的目标不是“看起来差不多”，而是把最核心的本地阅读边界变成可重复验证的事实：

- 多格式确实能打开
- 重新进入同一页面后仍能正常读
- 文件关联 / 可信路径边界不是随手放开的

这次没有去改 `src/lib/reader/formats.ts` 或 `src-tauri/src/commands/library.rs`，因为现有实现已经满足这两个证据点；真正缺的是一组更完整、更容易 grep 的 smoke 断言。

## 验证

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`（PASS）
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --grep "opens and reopens"`（PASS）
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`（PASS）

## 没有包含

- 没有新增 Tauri 命令
- 没有修改格式支持列表
- 没有重做桌面 trusted-open 逻辑，只是把已有证据在 checklist 里收口
