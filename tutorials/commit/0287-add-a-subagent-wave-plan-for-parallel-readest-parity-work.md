# 0287: add a subagent wave plan for parallel Readest parity work

这次不是继续补一个具体产品 feature，而是给接下来的并发执行先立规矩。

原因很现实：`br1` 现在最大的风险不再是“不知道下一步做什么”，而是多条 P0 主线如果同时推进，很容易全撞在几个热点文件上：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`
- `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`
- `/Users/dev/workspace2/hc_apps/br1/.planning/FEATURE-PARITY-AUDIT.md`
- `/Users/dev/workspace2/hc_apps/br1/tutorials/commit`

如果不先明确 ownership，再开多个 subagent，最后得到的不会是并发提速，而是合并地狱。

## 这一步做了什么

新增：

- `/Users/dev/workspace2/hc_apps/br1/.planning/SUBAGENT-WAVE-PLAN.md`

它把接下来的执行方式显式写成：

- `1` 个 orchestrator
- `3` 条并发执行 lane
- `1` 条后置 execution lane

### 文档里固定了三件事

#### 1. Orchestrator-only 路径

明确规定 subagent 不得编辑：

- `e2e/app.e2e.ts`
- `tests/e2e/library-smoke.spec.ts`
- `FEATURE-PARITY-AUDIT.md`
- `tutorials/commit`

这等于先把：

- integration
- regressions
- parity audit
- tutorial
- final commit

统一收归 orchestrator。

#### 2. 每个 worker 的唯一写范围

文档把并发 lane 固定成：

- Worker A: `P0-2 Reader Settings`
- Worker B: `P0-4 Library Management`
- Worker C: `P0-1 Multi-format and Open-With`
- Worker D: `P0-3 Search and Annotation`

而且每条 lane 都不是按“功能名字”分，而是按真实 write set 分。

这点很关键，因为 `br1` 现在的冲突不是抽象层面的，而是具体文件层面的。

#### 3. Wave 顺序和验证合同

文档还把执行顺序固定成：

1. `Wave 0`
2. `Wave 1`
3. `Wave 2`
4. `Wave 3`

并给每个 worker 都补了最小 targeted verification contract，防止 subagent 各自乱跑全量回归。

## 为什么这一步值钱

很多“并发计划”最大的问题是只写：

- 谁做什么

但不写：

- 谁不能改什么
- 谁负责最后集成
- 每条 lane 最小该跑什么验证

没有这些，subagent 一启动就会默认去碰：

- 测试入口
- parity audit
- 教程

而这正好是当前 `br1` 最不能同时乱写的地方。

所以这一步真正收的是：

- ownership
- wave gates
- verification contract

也就是并发执行真正需要的执行骨架。

## 还没做什么

这一步还没有开始新的产品功能实现。

它只完成了 `Wave 0` 里最关键的那一部分：

- 把并发执行规则写成 checked-in artifact

接下来才是：

- 启动 `A/B/C`
- 收第一波 runtime patch
- 由 orchestrator 集成、回归、审计、提交

## 你可以学到什么

### 1. 并发不是先开 agent，而是先锁 ownership

如果 ownership 没锁，subagent 数量越多，冲突越快。

### 2. 最值钱的并发拆分是按 write set，不是按功能名平均分

`br1` 现在真正限制并行度的不是 feature 列表，而是：

- reader 核心热点
- library 页面热点
- test/audit/tutorial 热点

这也是为什么这次文档首先写的是“谁不能碰哪些文件”。

## 验证

实际跑过：

```bash
git diff --check
```

结果：

- PASS
