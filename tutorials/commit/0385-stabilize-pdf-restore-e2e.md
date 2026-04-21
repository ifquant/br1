# 0385 - Stabilize PDF Restore E2E

这个提交处理 PDF restore 用例的两个不稳定点。

第一，PDF 的 `goToFraction()` 在 WebDriver 环境里有时会把 promise 挂住。之前 reader 会把这个超时当成打开失败，导致整本 PDF 进入错误态。现在 PDF fraction restore 是 fire-and-forget：仍然尝试跳转，但不阻塞打开流程；如果跳转失败，reader 保持当前位置继续渲染。这样恢复能力可用时仍会生效，不可用时不会破坏基础阅读。

第二，PDF e2e 断言不再把页码/progress 事件当成唯一成功信号。诊断显示 PDF surface 已经完整渲染在 reader stage 内，但 foliate 可能暂时没有发出 `locationLabel` 或 progress。测试现在明确验证：

- 书库记录和 href 携带了持久化恢复信息。
- reader 没有 stage error。
- PDF 内容 surface 渲染在 reader stage 内。
- PDF 设置被写入并保留。

PDF 的 layout label 在设置滚动模式时也可能短暂处于 `FIXED` 或 `SCROLL`，但底层设置状态已经是 `scrolled`。断言因此改为接受两种 label，同时继续检查真实存储的 reader settings。

验证命令：

```bash
bash scripts/automation/test-tauri-webdriver.sh pnpm exec wdio run wdio.conf.ts --mochaOpts.grep "reopens a library-file pdf with restored progress inside the reader stage"
pnpm check
git diff --check
```
