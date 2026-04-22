# 0392 - 给 startup associated-open 补 Rust 启动阶段轨迹

## 背景

startup associated-open 这条线前面已经有两层调查工具：

- focused / stress reproducer
- queue state inspection

但如果下次再失败，只有这两层仍然不够。因为就算我们知道：

- 当前窗口还停在 `/library`
- pending queue 里还有没有请求

也仍然不知道 Rust 侧到底经历了哪几步：

- `setup`
- `single_instance`
- `opened`
- `queue_with_report`
- `queue_runtime`
- `consume`

如果这层顺序不可见，后面还是只能猜。

## 主要目标

这次提交只做诊断增强，不改 startup associated-open 的真实行为：

1. 在 Rust 侧记录 associated-open 的启动阶段轨迹
2. 把这份轨迹也塞进 startup repro 的失败信息

这样下一次如果再掉进 `main -> /library`，我们可以直接看出：

- 请求有没有在 `setup/opened/single_instance` 阶段进入队列
- `queue_runtime` 是否真正发出了 event
- `consume` 是否被调用过

## 改动概览

- 在 [`src-tauri/src/models.rs`](/Users/dev/workspace2/hc_apps/br1/src-tauri/src/models.rs) 新增 startup associated-open 诊断缓冲
- 在 [`src-tauri/src/lib.rs`](/Users/dev/workspace2/hc_apps/br1/src-tauri/src/lib.rs) 给 `setup`、`single_instance`、`opened`、`queue_with_report` 加诊断记录
- 在 [`src-tauri/src/commands/library.rs`](/Users/dev/workspace2/hc_apps/br1/src-tauri/src/commands/library.rs) 给 `queue_runtime` 和 `consume` 加诊断记录，并新增 webdriver-only 读取命令
- 在 [`e2e/app.e2e.ts`](/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts) 把 `Diagnostics` 一起拼进 startup timeout 信息
- 在 [`docs/startup-associated-open-slice.md`](/Users/dev/workspace2/hc_apps/br1/docs/startup-associated-open-slice.md) 里补充这层新诊断面

## 关键知识

### 1. 调查 intermittent startup 问题时，阶段顺序和状态快照同样重要

`Startup state` 和 `Queue state` 属于“当前状态快照”。  
但启动问题很多时候不是卡在某个最终状态，而是卡在“本来应该发生的步骤没有发生”。

所以这类问题的诊断通常需要两层：

- 状态快照：现在是什么样
- 阶段轨迹：是怎么走到这里的

没有第二层，很多失败现场仍然无法区分。

### 2. 诊断缓冲比临时打印更适合给 e2e 读取

如果只是把这些信息 `println!` 到终端，排查时还是得翻长日志，而且不容易跟某次失败用例绑定。  
把它们存在一个小的 ring buffer 里，再通过 webdriver-only command 读出来，e2e 就能把“这次失败对应的启动轨迹”直接拼进 timeout。

这比肉眼对日志要可靠得多，也更适合后续自动化比较。

## 验证

- `bash scripts/automation/test-tauri-webdriver-startup-associated-open.sh`（PASS）
- `pnpm check`（PASS）
- `git diff --check`（待本提交执行）

## 未覆盖项

- 这次没有修复 startup associated-open
- 这次没有采到新的失败样本，所以新轨迹还没有展示出根因，只是为下一次失败提前准备好了信息
- 这次只增强诊断，不改变稳定 desktop full suite 的任何行为
