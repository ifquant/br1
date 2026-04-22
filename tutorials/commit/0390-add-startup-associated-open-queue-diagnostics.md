# 0390 - 给 startup associated-open 补 queue 诊断

## 背景

上一刀已经把 startup associated-open 固定成了仓库内的 focused reproducer：

- `pnpm test:e2e:tauri:startup-associated-open`

但那条 reproducer 当时复现到的失败，只能看到结果层：

- app 停在 `main -> /library`
- reader window 没打开

还不能回答更关键的问题：

- 请求根本没入队？
- 还是已经入队，但 `main` 没有 flush？

如果这层不可观测，后续只能继续靠猜。

## 主要目标

这次提交只做诊断增强，不改 startup associated-open 的实际行为：

1. 给 webdriver 暴露 pending associated-open queue 的只读查看命令
2. 把 startup reproducer 失败时的 queue state 一起打进 timeout 信息

这样下次再掉进 `/library` 停住时，日志就能直接告诉我们：

- queue 是空的
- 还是 queue 里其实还堆着请求

## 改动概览

- 在 [`src-tauri/src/commands/library.rs`](/Users/dev/workspace2/hc_apps/br1/src-tauri/src/commands/library.rs) 新增 `inspect_associated_book_open_requests_for_webdriver`
- 在 [`src-tauri/src/lib.rs`](/Users/dev/workspace2/hc_apps/br1/src-tauri/src/lib.rs) 把这个命令挂进 webdriver invoke handler
- 在 [`e2e/app.e2e.ts`](/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts) 新增 `inspectAssociatedBookOpenQueue()`
- startup associated-open 用例的 timeout 现在会同时输出：
  - `Startup state`
  - `Queue state`

## 关键知识

### 1. 诊断命令最好是只读的，并且只在测试能力里暴露

这里没有把 queue inspection 做成正式产品命令，而是只在 `webdriver` feature 下暴露。  
这样做的原因很直接：

- 产品路径不需要这个能力
- 但测试和调查需要它

把这种工具留在测试能力层，可以避免为了排查问题把内部状态暴露给正常前端调用面。

### 2. 间歇性问题先补可观测性，比直接改逻辑更值

startup associated-open 现在的问题不是“稳定 100% 失败”，而是会抖动。  
面对这种问题，如果没有足够诊断就直接改 owner 逻辑，最容易把真正稳定的主线重新污染掉。

更稳妥的顺序是：

1. 先让失败时留下足够信息
2. 再根据失败样本决定改哪一层

这能显著减少“修了半天，其实在打另一类问题”的概率。

## 验证

- `bash scripts/automation/test-tauri-webdriver-startup-associated-open.sh`（PASS）
- `for i in 1 2 3 4 5; do bash scripts/automation/test-tauri-webdriver-startup-associated-open.sh; done`（5 次都 PASS；说明当前失败仍是间歇性的，还没再次采到新的 queue-state 失败样本）
- `pnpm check`（PASS）
- `git diff --check`（待本提交执行）

## 未覆盖项

- 这次没有修复 startup associated-open
- 这次没有再次复现 `main -> /library` 的失败样本，所以还不能下结论说 queue 是“没入队”还是“未消费”
- 这次只是把下一次失败时需要的信息提前准备好
