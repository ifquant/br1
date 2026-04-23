# 0486 - 认证 P0 读者设置与搜索缓存回归

这一刀先补了 `Task 3` 里最容易 grep 的两条桌面回归证据，重点不是改实现，而是把现有 reader 行为压成可重复验证的 P0 测试。

覆盖文件：

- [`/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/e2e/app.e2e.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/e2e/app.e2e.ts)

## 这刀做了什么

1. 新增 `P0 settings persist across reopen`

   这个回归用一个独立导入的 `sample-book.epub` 作为桌面样本，先切换 reader flow、字体、字号、行距、页边距和宽度模式，再关闭并重新打开同一本书，确认：

   - reader settings 的 localStorage 仍然保留
   - 重新打开后 reader 仍然回到 `SCROLL`
   - 这条路径没有因为 reopen 丢失设置驱动的真实 UI 状态

2. 新增 `P0 search cache can replay and clear current-book search`

   这个回归先把当前书的 search cache 写到磁盘，再重新打开同一本书并切到搜索面板，确认：

   - 搜索缓存状态面板能显示当前书缓存
   - 点击缓存查询项可以把 query replay 回搜索框
   - 点击清空缓存会给出用户可见提示
   - 磁盘上的当前书缓存条目会被真正删掉

3. 复用现成的桌面 helper

   新增了 `openLibrarySampleInReader` 和 `reopenLastReaderBook`，避免在测试里重复写 sample 导入和 reopen 的样板代码。

## 为什么这么切

Task 3 的第一刀只需要证明两个最关键的 P0 回归点：

- reader settings 不是只存在于菜单状态里，而是真的能穿过 reopen
- current-book search cache 不是只在 UI 中“看起来像有”，而是真的能 replay 和 clear

这两个测试都尽量直接走桌面可见路径，避免先改实现再补证据，方便后续只在测试暴露真实缺口时再动组件或 service 层。

## 验证

- `pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec check`
- `bash /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/scripts/automation/test-tauri-webdriver.sh pnpm exec wdio run wdio.conf.ts --mochaOpts.grep "P0 settings persist across reopen|P0 search cache can replay and clear current-book search"`
- `git -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec diff --check`

## 没有包含

- 没有改 reader 组件或 search service 实现
- 没有把 `P0-3.2`、`P0-4.1`、`P0-4.2` 标成完成
- 没有重写既有的长链 search-history 回归
