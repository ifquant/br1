# 0207 把 roadmap 从旧 phase 顺排改成 P0/P1/P2 主线

## 这次改动想解决什么

前一刀已经补了 `.planning/FEATURE-PARITY-AUDIT.md`，但如果 `ROADMAP.md` 还保持旧的数字 phase 顺排，就会出现一个结构性问题：

- 产品总账在说：先看 feature 行是否真正关闭
- roadmap 却还在说：继续沿着旧 phase 1 → 12 往下排

这两套结构会互相打架。

结果就是：

- 容易继续按局部 reader/library 小切片推进
- 却很难从全局判断 P0 有没有真的收口
- 更难阻止 P1/P2 的功能零散混进当前主线

所以这次不是补一个计划文件，而是把 planning 主骨架重写。

## 做了什么

### 1. 重写 `ROADMAP.md`

这次把 roadmap 的顶层结构从旧的数字 phase 改成了三条主线：

- `P0 Core Reader`
- `P1 Advanced Reading Experience`
- `P2 Services and Ecosystem`

这意味着 roadmap 不再默认回答“下一号 phase 是什么”，而是回答：

- 现在主线在哪一层
- 这一层到底要关掉哪些 feature 行
- 后面的能力为什么现在不做

这更符合你现在的目标：整体 feature 对齐，而不是局部相似度对齐。

### 2. 在 roadmap 里把 P0 明确拆成 4 个执行 workstreams

这次没有让 `P0` 停留在一个抽象词，而是继续拆成：

- `P0-1 格式与打开基座`
- `P0-2 阅读模式与版式系统`
- `P0-3 搜索、批注、书签、进度`
- `P0-4 Library 管理`

这样后面执行时既不会太散，也不会又退回到“按页面推进”。

它的好处是：

- 每条线都直接对应 feature 行
- 每条线都能写清楚 success criteria
- 后面做状态更新时，也能直接回写到 feature audit

### 3. P1 / P2 不再模糊存在，而是被正式冻结

以前 roadmap 里虽然也有“服务能力”“高级能力”，但它们更像后面的泛泛 phase。

这次把它们正式定义成：

- `P1 Advanced Reading Experience`
- `P2 Services and Ecosystem`

同时明确写死：

- **当前不执行**
- **只冻结边界**
- **不允许在 P0 未关闭前零散插入**

这一步的价值非常高，因为它解决的是节奏问题，不是排版问题。

### 4. 新建 `p0-core-reader` 的 4 份计划

这次在 `.planning/phases/p0-core-reader/` 下新增了：

- `P0-1-PLAN.md`
- `P0-2-PLAN.md`
- `P0-3-PLAN.md`
- `P0-4-PLAN.md`

每份都按现在的新逻辑写：

- 对应哪些 feature rows
- 当前 brownfield 基础是什么
- 主要缺口是什么
- 要交付什么
- 怎么分 wave
- done when 是什么

也就是说，这次不是只换了 roadmap 目录标题，而是真的把新主线变成了可执行计划集。

### 5. 旧数字 phase 文档保留成历史执行记录

你要求不能丢掉已经完成的实现证据，所以这次没有删：

- `01-*`
- `02-*`
- `03-*`
- `04-*`

这些目录现在在新 roadmap 里被明确标成：

- **Historical Execution Record**

这样后面不会再把它们当主执行线，但历史上下文也不会丢。

### 6. `STATE.md` 也同步切到新主线

如果只改 roadmap，不改 state，后面一恢复工作上下文就会继续以旧 phase 思维推进。

所以这次 `STATE.md` 也一起改了：

- 当前焦点改成 `P0 planning restructure and execution sequencing`
- 最新 planning artifacts 指向新的 feature audit、roadmap 和 `P0-*` 计划
- `Decisions In Force` 也同步写入了：
  - feature audit 优先
  - 先收 P0
  - P1/P2 冻结边界
  - 旧 phase 只作历史记录

## 验证

这次是 planning 重构切片，实际跑过：

```bash
find .planning/phases/p0-core-reader -maxdepth 1 -type f | sort
```

结果：4 份 `P0-*` 计划文件都在

```bash
git diff --check
```

结果：`PASS`

没有跑产品测试，因为这一步没有改运行时代码。

## 这次顺手能学到的编程知识

### 1. roadmap 是执行结构，不只是目录列表

很多项目的 roadmap 只是“把要做的事列出来”，但当项目变复杂以后，roadmap 本身也会变成一种架构：

- 它决定大家按什么单位推进
- 决定哪些东西算当前主线
- 决定哪些东西被延后

如果 roadmap 结构错了，后面即使每一步都很努力，也可能一直在错误的节奏上优化。

### 2. 历史执行记录和当前主执行线最好分开

已经完成的旧 phase 文档仍然有价值，因为它们记录了：

- 当时为什么这么拆
- 做过哪些 brownfield 改造
- 哪些问题已经处理过

但它们不一定还适合作为“现在怎么继续做”的主结构。

一个更稳的做法就是像这次这样分开：

- 旧文档保留
- 新主线重建

这样既不丢历史，也不被历史结构绑住。

## 还没有处理什么

- 这一步没有更新 `REQUIREMENTS.md`
- 没有把 feature audit 自动和 roadmap 状态联动
- 也没有开始执行 `P0-1`

这一步只是先把 planning 主骨架换成能支撑整体 feature 对齐的结构。
