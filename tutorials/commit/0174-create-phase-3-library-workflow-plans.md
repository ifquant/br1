# 0174 创建 Phase 3 的 library workflow 计划集

## 这次改动做了什么

这一步没有改产品代码，只把 `Phase 3` 的执行边界补齐。

我新增了三份 plan：

1. `03-01-PLAN.md`
   - 收口 `continue reading` 和 `最近阅读` 的产品化分区
2. `03-02-PLAN.md`
   - 打通 reader 阅读状态回流和书库排序
3. `03-03-PLAN.md`
   - 完成 Readest 本地藏书数据兼容与迁移语义

同时我更新了：

- `ROADMAP.md`
- `STATE.md`

让当前项目状态正式从 `Phase 2` 切换到 `Phase 3 planning`。

## 为什么这一步重要

前两阶段把 library 的输入层、视觉层和基础行为层收住了，但离真正的 `Readest` 书库工作流还有一个明显缺口：

- continue reading 还没有完全产品化
- reader 的阅读状态回流还没有被当成正式契约
- Readest 藏书兼容还偏“能导进来”，不是“明确兼容”

如果直接跳去 reader 视觉对齐，library 这层会留下结构债。

所以这一步的价值在于先把 `Phase 3` 的问题域锁住，避免后面继续跨层乱跳。

## 你可以学到的工程知识

### 1. 计划不是重复 roadmap，而是把“问题层”切开

roadmap 说的是：

- 这一阶段要解决什么

plan 说的是：

- 这个阶段内部最适合怎么切
- 每一刀的输入、输出和边界是什么

如果 roadmap 很长但没有 plan，执行时就容易反复跨层。

### 2. Brownfield 项目尤其需要先明确“这一阶段先不做什么”

这三份 plan 都明确写了 `Out of scope` 和 `Not Planned Here`。

原因很直接：

- 老项目里总有很多看起来相关的东西
- 但如果 scope 不锁，执行时就会一边修 library，一边忍不住跳去 reader、服务、同步

这会让 phase 永远收不完。

## 本次相关文件

- `.planning/phases/03-library-workflow-completion/03-01-PLAN.md`
- `.planning/phases/03-library-workflow-completion/03-02-PLAN.md`
- `.planning/phases/03-library-workflow-completion/03-03-PLAN.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
