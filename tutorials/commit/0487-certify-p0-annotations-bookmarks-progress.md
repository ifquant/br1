# 0487 - 认证 P0 标注、书签与进度恢复

这一刀把 `P0-3.2` 需要的桌面证据收拢成一个可 grep 的回归切片，重点是把 TXT 这条支持格式的标注、书签和 reopen 进度恢复压成一条连续 reader 流程。

覆盖文件：

- [`/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/e2e/app.e2e.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/e2e/app.e2e.ts)
- [`/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/.planning/READEST-ALIGNMENT-CHECKLIST.md`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/.planning/READEST-ALIGNMENT-CHECKLIST.md)

## 这刀做了什么

1. 新增 `P0 annotations notes bookmarks and progress restore`

   这条回归沿用 TXT 桌面阅读流，先创建高亮和笔记，再在当前进度点保存书签，随后：

   - 验证书签卡片在桌面界面里可见，并在 reopen 后仍然存在
   - 刻意离开当前位置后点击书签，确认它能跳回保存的位置
   - 关闭并重新打开同一本书，确认进度恢复到同一段阅读位置
   - 重新进入笔记与书签面板，确认已保存的标注和书签仍然可见

2. 给 bookmark 证据补了直接可见的 desktop 约束

   新增了 bookmark 文件读写辅助和当前阅读位置书签按钮的点击辅助，避免测试靠脆弱选择器拼 UI。

## 为什么这么切

P0-3.2 的关键不是再堆一堆 UI 截图，而是把 Readest 风格的 reader 核心动作收成一条可复现的桌面证据：

- 至少一种支持格式能创建高亮、笔记和书签
- 书签能把读者带回之前的阅读位置
- reopen 之后进度仍然恢复

把这三件事收进同一个 TXT 回归里，后续 review 时可以一次 grep 到对应的桌面证据点。

## 验证

- `pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec check`
- `pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec exec wdio run wdio.conf.ts --mochaOpts.grep "P0 annotations notes bookmarks and progress restore"`
- `git -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec diff --check`

## 没有包含

- 没有修改 P0-4 系列库文件
- 没有把 `P0-2.2`、`P0-4.1`、`P0-4.2` 标成完成
- 没有额外重写既有的 EPUB/FB2 长链标注回归
