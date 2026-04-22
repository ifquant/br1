# 0388 - 记录 startup associated-open 的独立切片边界

## 背景

上一轮已经把 reader reopen 的 full-only 长跑问题收平，标准 desktop full suite 回到了稳定状态：

- `38 passing / 1 skipped`

剩下唯一被跳过的，就是 startup associated-file 这条冷启动用例：

- `opens a startup associated book argument in a separate reader window`

这时最容易犯的错误，是为了顺手把这个 skip 收掉，直接去放宽全局启动逻辑。可这条线真正碰到的是 app 启动阶段的 queue ownership，不是一个普通的小 helper。

## 主要目标

这次没有再继续改稳定主线代码，而是把调查结论落成仓库内文档，明确三件事：

1. startup associated-open 在 dedicated focused 条件下其实可以成立
2. 当前未收口的真正问题是“谁负责消费 startup queue”
3. 这条能力必须作为单独 slice 继续推进，不能再混进标准 full harness 里顺手修

## 改动概览

- 新增 [`docs/startup-associated-open-slice.md`](/Users/dev/workspace2/hc_apps/br1/docs/startup-associated-open-slice.md)，记录 startup associated-open 的现状、实验结果和后续切法
- 把 dedicated startup 命令、标准 full 的稳定边界，以及失败退化到 `34 passing / 4 failing / 1 skipped` 的事实写进文档
- 明确写下当前结论：参数注入不是主问题，主问题是 startup window ownership / queue consumer ownership

## 关键知识

### 1. 启动参数能进队列，不代表产品链路已经闭环

这次调查里，dedicated 命令已经能把 `APP_OPEN_ARGS` 传进 Tauri，并让 Rust 侧把文件路径排进 associated-open queue。  
但只要前端没有一个被允许的窗口去 `consume_associated_book_open_requests`，队列就只是“已经有了请求”，不是“用户真的看到书被打开了”。

这类问题的关键不在参数本身，而在“队列的消费者是谁、什么时候消费”。

### 2. 启动阶段的 owner 判定，比运行时 reopen helper 更容易污染整套 e2e

之前 reader reopen 那条线，大部分改动集中在 helper、window recovery 和 stale handle 清理，影响面虽然大，但仍然属于“已经启动后的恢复逻辑”。  
startup associated-open 这次不同，它触碰的是 app 启动后的第一轮 queue flush owner。这个判断一旦放宽过头，就可能把标准 full suite 的 library / reader 时序一起污染掉。

所以遇到这种问题，正确做法不是继续加 wait，而是先把 ownership 模型单独钉清楚。

## 验证

- `APP_OPEN_ARGS="/Users/dev/workspace2/hc_apps/br1/static/samples/sample-book.fb2" BR1_TEST_ASSOCIATED_FILE_PATH="/Users/dev/workspace2/hc_apps/br1/static/samples/sample-book.fb2" bash scripts/automation/test-tauri-webdriver.sh pnpm exec wdio run wdio.conf.ts --mochaOpts.grep "opens a startup associated book argument in a separate reader window"`（PASS，focused dedicated startup case）
- `bash scripts/automation/test-tauri-webdriver.sh pnpm exec wdio run wdio.conf.ts`（基线仍是之前已验证通过的 `38 passing / 1 skipped`；本次文档提交未重新改动主线实现）
- `git diff --check`（PASS）

## 未覆盖项

- 还没有解决 dedicated startup 时首个 library window 为什么不是 `main`
- 还没有决定最终方案是改 Tauri window labeling、queue owner 判定，还是单独做 startup-only harness
- 这次提交只记录边界，不代表 startup associated-open 已经可以合并回标准 full suite
