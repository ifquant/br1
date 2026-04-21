# 0384 - Wait for Removable Shelf Book

这个提交修的是桌面端删除/撤销书库条目的 e2e 时序问题。用例在导入临时 TXT 文件后刷新书库页面，之前只等待 `[aria-label="你的书库"]` 容器存在，然后马上在容器里按 `filePath` 找书卡并点击“详情”。完整套件里刷新和书库数据加载可能不同步，容器已经出现时目标书卡还没渲染，于是点击详情返回 `false`。

修复方式很小：刷新后先通过 `readLibraryHrefForPath(importedBook.filePath)` 等待目标 reader href 出现在 DOM 里，再执行详情按钮点击。这个等待条件比等待 shelf 容器更接近用户真实意图：不是“书库区域出现了”，而是“刚导入、准备删除的那本书已经出现在书库里”。

这个改动没有改变产品删除逻辑。它只让测试在操作 UI 前等待目标元素就绪，避免 full e2e 里出现偶发的空 shelf 竞态。

验证命令：

```bash
bash scripts/automation/test-tauri-webdriver.sh pnpm exec wdio run wdio.conf.ts --mochaOpts.grep "removes an imported shelf book without deleting the original source file and can undo the removal"
pnpm check
git diff --check
```
