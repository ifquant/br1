# 0163 为 Phase 1 生成第一份执行计划

## 这次改动做了什么

这次还是没有改产品代码，而是把 `Phase 1` 的第一份执行计划正式落到了：

- `.planning/phases/01-library-ingestion-baseline/01-01-PLAN.md`

同时我同步更新了：

- `.planning/ROADMAP.md`
- `.planning/STATE.md`

这样现在 `br1` 不只是“有一张大 roadmap”，而是已经有了第一份可执行的 plan。

## 这份计划解决什么问题

`Phase 1` 的核心不是 UI，而是“输入层稳不稳”。

也就是说，在继续对齐 `Readest` 之前，先要解决：

- 本地图书怎么导入
- `Readest` 本地书库怎么迁移
- 打开原文件怎么走
- `library-file` reader href 怎么构建
- 这些桌面能力的错误边界在哪里

如果这些事情不先稳住，后面的 library 视觉对齐、reader 对齐、自动化回归都会建立在脆弱基础上。

## 你可以学到的工程知识

### 1. Roadmap 不等于 Plan

`ROADMAP.md` 只回答：

- 要分几个 phase
- 每个 phase 大概解决什么问题

但它不会回答：

- 这一刀具体改哪些文件
- 哪些属于 scope，哪些不属于
- 要先做什么，后做什么
- 最后怎么验证

这些才是 `PLAN.md` 要做的事。

### 2. Brownfield 规划要先写“已有实现”

如果是老项目，计划里不能只写“要做什么”，还要写：

- 现在已经有什么
- 当前哪里是补丁式实现
- 这次应该复用哪些代码
- 哪些地方不能乱碰

这就是为什么 `01-01-PLAN.md` 里专门写了 `Brownfield Context`。

## 你接下来怎么看这份计划

看这几个部分就够了：

- `Why This Plan Exists`
- `Brownfield Context`
- `Scope`
- `Execution Plan`
- `Done When`

如果这些地方写得清楚，后面执行时就不容易“顺手多做一堆不属于这一步的东西”。

## 本次相关文件

- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/phases/01-library-ingestion-baseline/01-01-PLAN.md`
