# 0162 初始化 GSD 项目文档，锁定 Readest 全量对齐路线

## 这次改动做了什么

这次没有改产品代码，而是把 `br1` 的规划底座正式写进 `.planning/`：

- 新建 `PROJECT.md`，明确 `br1` 的长期目标是 AI 阅读器，但第一阶段是 `Readest` 全量对齐
- 新建 `REQUIREMENTS.md`，把第一阶段需求拆成可检查的 requirement IDs
- 新建 `ROADMAP.md`，把全量对齐拆成 12 个 phase
- 新建 `STATE.md`，记录当前阶段、关键决策和下一步建议
- 用 GSD 工具生成 `.planning/config.json`，固定当前 workflow 配置

## 为什么这一步重要

如果没有这些文档，后面很容易出现两个问题：

1. 讨论的是“理想中的 AI 阅读器”，执行时却在修一个普通阅读器
2. 大家都说“对齐 Readest”，但没人知道到底哪些能力算第一阶段必做

把这些边界写死后，后续每一个 phase 和 plan 都会更稳定，也更容易判断是否偏题。

## 你可以学到的编程/工程知识

### 1. 需求文档不是写功能清单，而是写“完成定义”

好的 `REQUIREMENTS.md` 不该只是：

- 做书库
- 做搜索
- 做笔记

而应该是：

- `SRCH-01`: 用户可以对正文做真正的全文搜索，而不是仅限目录过滤

这样写的好处是：

- 可以验证
- 可以映射到 roadmap phase
- 后面做 review 时更容易发现“看起来有，但其实没做完整”

### 2. Brownfield 项目不能按 Greenfield 的方式规划

`br1` 不是空仓。它已经有：

- 书库/阅读器骨架
- 桌面窗口
- 搜索/笔记/书签第一版
- 自动化基线

所以 roadmap 不能写成“从零开始做阅读器”，而要写成：

- 哪些链路已经存在
- 哪些只是雏形
- 哪些要补齐到 `Readest` 等级

这就是 brownfield 规划和 greenfield 规划最大的不同。

## 后续怎么看这些文件

- `.planning/PROJECT.md`：看项目定义和硬边界
- `.planning/REQUIREMENTS.md`：看第一阶段到底要做什么
- `.planning/ROADMAP.md`：看顺序和分 phase 的拆法
- `.planning/STATE.md`：看当前做到哪一步、下一步建议是什么

## 本次相关文件

- `.planning/config.json`
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
