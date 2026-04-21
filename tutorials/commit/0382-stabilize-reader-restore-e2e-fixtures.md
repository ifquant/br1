# 0382 - Stabilize Reader Restore E2E Fixtures

## 背景

隔离 WebDriver `HOME` 后，部分 reader restore 测试不再能依赖真实用户书库里已有的 EPUB/PDF 进度记录。旧测试会先从 shelf 里找一本可用书，再尝试自然打开并等待 reader 写入恢复进度；在空白临时 HOME 下，这会变成不稳定的环境假设。

## 关键实现

本次将 EPUB/PDF restore 相关 helper 改成受控 fixture：

- EPUB restore 测试显式导入 `sample-book.epub`，写入受控 `progressFraction`，再从书库打开验证可见阅读位置。
- PDF restore 测试显式导入 `sample-outline.pdf`，写入受控 PDF 页码进度，再验证 reader 恢复和固定版式设置。
- “新打开 shelf EPUB 进入阅读流”测试通过受控导入路径打开 EPUB，而不是枚举可能不存在的 shelf 链接。
- EPUB 宽度测试改为断言 reader viewport/header/footer chrome 扩宽；foliate 内部列宽保持阅读约束是合理行为，不再把 paginator 内部列宽当作宽度模式的唯一信号。

## 验证

本轮通过的检查：

- `pnpm check`
- `git diff --check`
- `bash scripts/automation/test-tauri-webdriver.sh pnpm exec wdio run wdio.conf.ts --mochaOpts.grep "restores a library-file epub into a visible reading position"`
- `bash scripts/automation/test-tauri-webdriver.sh pnpm exec wdio run wdio.conf.ts --mochaOpts.grep "changes the visible epub reading column width"`
- `bash scripts/automation/test-tauri-webdriver.sh pnpm exec wdio run wdio.conf.ts --mochaOpts.grep "moves a newly opened shelf epub"`
- `bash scripts/automation/test-tauri-webdriver.sh pnpm exec wdio run wdio.conf.ts --mochaOpts.grep "reopens a library-file pdf"`

全量 `pnpm test:e2e:tauri` 仍未通过。剩余失败集中在 FB2 自然进度持久化、reader 设置持久化、搜索缓存恢复，以及失败后的窗口状态级联；这些应拆到后续 reader 行为 slice。
