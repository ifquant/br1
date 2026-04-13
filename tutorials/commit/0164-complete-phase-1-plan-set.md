# 0164 补齐 Phase 1 的全部计划文档

## 这次改动做了什么

这次把 `Phase 1` 剩下两份计划也补齐了：

- `.planning/phases/01-library-ingestion-baseline/01-02-PLAN.md`
- `.planning/phases/01-library-ingestion-baseline/01-03-PLAN.md`

同时更新了 `.planning/STATE.md`，让当前状态从“Phase 1 只起了第一份计划”切到“Phase 1 的三份计划集已经完整”。

## 为什么这一步重要

如果只有 `01-01-PLAN.md`，那只说明：

- 先做导入服务边界统一

但还没有回答：

- library-file 到独立 reader 窗口的打开协议怎么固化
- 输入层到底怎么验证，失败时怎么处理

把 `01-02` 和 `01-03` 补上之后，`Phase 1` 才真正构成一个完整阶段：

1. 先收敛导入/路径服务
2. 再收敛 library-file 打开协议
3. 最后补验证和失败处理护栏

## 你可以学到的工程知识

### 1. 一个 phase 通常不是一个 plan

很多时候 roadmap 写成：

- Phase 1: 做导入基线

看起来已经很清楚了，但实际执行时会发现，里面至少包含三类不同工作：

- 结构边界
- 主路径协议
- 验证护栏

如果把它们硬塞进一个 plan，执行时就容易：

- scope 失控
- 做到一半开始顺手修别的问题
- 最后没人说得清这一步到底完成没

### 2. 好的计划要先定义“不做什么”

这三份 `PLAN.md` 里都专门写了 `Out of scope` / `Not Planned Here`。

这不是形式主义，而是为了防止执行时出现这种情况：

- 本来只想修导入协议
- 结果顺手去改 reader 布局
- 又顺手去补 continue reading
- 最后一整步做了很多，但主目标其实没锁住

写清“不做什么”，反而能让阶段推进更快。

## 现在 Phase 1 的结构

- `01-01`：统一本地图书导入、读取和路径访问服务
- `01-02`：固化 library-file 与独立 reader 窗口的桌面打开链路
- `01-03`：为导入基线补足基本验证和失败处理

## 本次相关文件

- `.planning/phases/01-library-ingestion-baseline/01-02-PLAN.md`
- `.planning/phases/01-library-ingestion-baseline/01-03-PLAN.md`
- `.planning/STATE.md`
