# 0391 - 给 startup associated-open 加一条 stress 入口

## 背景

startup associated-open 这条线现在已经有两样东西：

- focused reproducer
- queue diagnostics

但如果还要继续追 intermittent failure，只靠聊天里手写：

```bash
for i in $(seq 1 20); do ...; done
```

这种方式不够稳，也不利于后续 agent 直接复用。

而且这一轮实际跑下来，20 次 dedicated startup 连跑全部通过，这个事实本身也值得被固定进仓库上下文里。

## 主要目标

这次提交只做一件事：

- 给 startup associated-open 补一条正式的 stress 入口

这样后续如果要继续追 intermittent failure，可以直接：

- 跑 focused single repro
- 跑 repeated stress repro

不需要再手抄循环命令。

## 改动概览

- 新增 [`scripts/automation/test-tauri-webdriver-startup-associated-open-stress.sh`](/Users/dev/workspace2/hc_apps/br1/scripts/automation/test-tauri-webdriver-startup-associated-open-stress.sh)
- 新增 `package.json` 脚本：
  - `pnpm test:e2e:tauri:startup-associated-open:stress`
- 脚本默认连跑 20 次，也允许传自定义次数
- 在 [`docs/startup-associated-open-slice.md`](/Users/dev/workspace2/hc_apps/br1/docs/startup-associated-open-slice.md) 里补上 stress 入口和最新观察：
  - 最近一轮 20 次连跑全绿
  - 当前更像低概率 intermittent，而不是稳定必现

## 关键知识

### 1. 间歇性问题最好区分 single repro 和 stress repro

single repro 的价值是：

- 快速确认路径还活着
- 快速看失败时的第一现场

stress repro 的价值是：

- 估计失败概率
- 判断问题是“常态错误”还是“低概率抖动”

这两类入口分开，后续调查效率会高很多。

### 2. 把一次性 shell 循环变成仓库脚本，本质上是在保存调查方法

很多 intermittent 问题最后不是卡在代码本身，而是卡在“后来的人不知道当时是怎么复现的”。  
把 stress 命令收成脚本，保存的不是功能，而是调查方法。

这类脚本即使暂时不改产品行为，也能显著降低上下文损耗。

## 验证

- `bash scripts/automation/test-tauri-webdriver-startup-associated-open-stress.sh`（PASS，20/20）
- `pnpm check`（PASS）
- `git diff --check`（待本提交执行）

## 未覆盖项

- 这次没有修复 startup associated-open
- 这次没有再次采到失败样本
- 这次只是把 stress 调查入口固定下来，方便后续继续追 intermittent failure
