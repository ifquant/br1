# 0386 - Stabilize Reader Store E2E Boundaries

这次提交收的是 reader notes / highlights / search 这一簇桌面 e2e 的“测试边界错位”问题，不是一个单独业务 bug。

主要有三类：

1. 本地化后的断言还在查英文 footer 文案。
   TXT / EPUB / MOBI / AZW3 / FB2 的 reader 设置断言原来直接查 `SCROLL`，但当前 UI footer 显示的是中文。测试现在统一通过 `readReaderDetails().layoutLabel` 的归一化值判断布局模式，避免文案本地化把设置用例打红。

2. 重新打开同一本书后，记录追踪不应该只靠 `sourcePath`。
   TXT 高亮/笔记用例在回到书库后有时会沿用旧 `filePath`。现在优先按稳定的记录 `id` 回查，再退回 `sourcePath`，减少书库记录刷新后的路径漂移。

3. search cache 用例之前把磁盘缓存种对了，但测试取 key 和断言路径不稳定。
   现在 search cache book key 直接复用 Tauri `load_library_file_fingerprint` 的真实 fingerprint，而不是测试自己拼 `mtimeMs`。另外，历史 query 回放这一步当前 UI 不稳定渲染 cached results 列表，所以用例改为验证：
   - 历史 query 会恢复 query/config。
   - Tauri `load_reader_search_cache` 能读到同一份磁盘缓存结果。
   - cache status / clear-cache notice / disk cleanup 路径仍然工作。

还顺手把 `issueSearchHistory` 改成直接把 history entry 的归一化 config 传给搜索 dispatch，避免依赖 `state.update()` 之后再从 store 读取同一个 config。

验证命令：

```bash
bash scripts/automation/test-tauri-webdriver.sh pnpm exec wdio run wdio.conf.ts --mochaOpts.grep "migrates legacy browser notes into the host-side book store when reopening a book|persists note edits and deletions through the host-side store|persists txt highlights and notes separately through the desktop reader store|persists epub highlights and notes separately through the desktop reader store|persists MOBI and AZW3 highlights and notes separately through the desktop reader store|persists FB2 highlights and notes separately through the desktop reader store|restores search history, options, and disk cache after reopening the same book"
pnpm check
git diff --check
```

当前仍有一个没有在这次提交里解决的 full-suite 问题：长跑到 notes/highlights 阶段后，`openReaderFromBook` 还会偶发碰到 Tauri reader window 没有按预期出现在 WebDriver handle 列表里的抖动。这个属于下一刀要专门处理的 WebviewWindow/handle 稳定性问题，不和这次的断言/缓存边界修复混在一起。
