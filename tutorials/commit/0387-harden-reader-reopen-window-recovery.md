# 0387 - Harden Reader Reopen Window Recovery

这次提交收的是一条更底层的桌面 WebDriver 稳定性问题：reader notes / highlights / search 这些长尾用例单跑能过，但 full suite 长跑时会一起掉进 `No window could be found`、`expected a reader window to open after clicking a library book`，最后看起来像很多业务用例同时坏掉。

真正的根因不在业务断言，而在 reader window 的恢复链太脆：

1. `cleanupReaderAttempt()` 之前只处理“当前窗口是不是 reader”，不会把残留的旧 reader window 全部扫掉。  
   full 跑久了以后，Tauri 可能留下旧的 reader handle；后面的 reopen 再去找“新开的 reader 窗口”，就会误判。

2. `recoverLibraryWindow()` 之前过度相信传进来的旧 `libraryHandle`。  
   但 handle 可能已经失效，或者虽然还存在却不再是 library page。如果后续 recovery 继续基于这个假设，整条 reopen 链都会越来越偏。

3. `findReaderWindowHandle()` 之前只接受“新 handle”。  
   如果 Tauri 复用了一个旧的非 library reader handle，测试会把“reader 其实已经开出来了”误判成“没有 reader window”。

4. `openUsableReaderBook()` 和一部分 reopen helper 还残留着老式的 `closeWindow() + switchToWindow(...)` 回退。  
   这种写法在短跑里常常没事，但在 full 长跑里最容易把坏 handle 留给下一条用例。

5. `openReaderFromLibraryPath(filePath)` 的 trusted reopen 需要区分“正常 library href reopen”和“associated-open fallback”。  
   如果一上来就强制 associated-open，会破坏某些依赖 library href / restore state 的正常 reopen；但如果完全不做 fallback，full 长跑里一旦 link-click / handle 识别抖动，又会把整串 notes/search reopen 拖死。

这次提交把这些点一起收口：

- `recoverLibraryWindow()` 现在会真正检查哪个 handle 仍然是 `.library-page`，而不是盲切旧 handle。
- `cleanupReaderAttempt()` 在回到 library 后，会继续扫掉剩余的非 library 窗口，减少旧 reader handle 残留。
- `findReaderWindowHandle()` 仍然优先找新 handle；如果没有新 handle，但只剩一个符合 reader 条件的非 library handle，也接受它，避免把 Tauri 的 handle 复用误判成打开失败。
- `openUsableReaderBook()` 的失败回退统一改成 `cleanupReaderAttempt()`，不再留老式窗口切换路径。
- `openReaderFromLibraryPath()` 现在优先走正常 library href reopen，只有这条路找不到 href 或 `openReaderFromBook()` 失败时，才退回 trusted associated-open fallback。

另外，这次顺手把 legacy-note 相关的持久化 key 收到了真实的 desktop notes storage key，也把当前选区的高亮/笔记动作改成 DOM 内现查现点，避免复用 stale 的 WebDriver element。

验证命令：

```bash
bash scripts/automation/test-tauri-webdriver.sh pnpm exec wdio run wdio.conf.ts --mochaOpts.grep "migrates legacy browser notes into the host-side book store when reopening a book|focuses the matching sidebar note when a document highlight is activated|persists note edits and deletions through the host-side store|persists txt highlights and notes separately through the desktop reader store|persists epub highlights and notes separately through the desktop reader store|persists MOBI and AZW3 highlights and notes separately through the desktop reader store|persists FB2 highlights and notes separately through the desktop reader store|restores search history, options, and disk cache after reopening the same book"
bash scripts/automation/test-tauri-webdriver.sh pnpm exec wdio run wdio.conf.ts
pnpm check
git diff --check
```

结果：

- 长尾 8 条 reopen / notes / highlights / search 用例一起通过。
- full desktop suite 通过，结果是 `38 passing / 1 skipped`。

这里一个值得记住的经验是：  
当一串 e2e 用例在 full 长跑里同时 timeout，不要先把注意力全放在业务断言上。很可能真正坏掉的是更早一层的 window/session 恢复链，而后面的 notes/highlights/search 只是被同一个坏句柄拖死。
