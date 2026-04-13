# 0168 为 Phase 2 生成 library 视觉对齐计划

## 这次改动做了什么

这次还没开始写 `Phase 2` 的产品代码，而是先把三份执行计划补出来：

- `02-01-PLAN.md`：顶部工具条和搜索行为
- `02-02-PLAN.md`：卡片、封面、元数据和状态展示
- `02-03-PLAN.md`：排序、筛选和滚动行为

同时把 `ROADMAP.md` 和 `STATE.md` 切到了 `Phase 2`。

## 为什么要先拆这三刀

`library` 页面看起来像一个整体，但实际有三种不同性质的工作：

1. 顶部控制层
2. 书籍展示层
3. 排序/筛选/滚动行为层

如果不先拆开，执行时就容易发生这种事：

- 本来只想修搜索框
- 顺手把卡片改了
- 又顺手改了滚动和排序
- 最后改动很多，但很难验证这一刀到底算不算完成

## 你可以学到的工程知识

### 1. 视觉对齐也要按“控制层 / 展示层 / 行为层”拆

很多人一说“视觉对齐”，就只想到 CSS。

但真正的 UI 对齐通常至少有三层：

- 控制层：按钮、搜索框、工具条
- 展示层：卡片、封面、文案层级
- 行为层：排序、筛选、滚动、切换方式

这三层如果混着改，后面就很难做 review。

### 2. Plan 的目标是防止“顺手过界”

这三份 `PLAN.md` 都写了 `Out of scope / Not Planned Here`。

这不是形式主义，而是为了防止执行时不断顺手：

- 修顶部时顺手改 continue reading
- 修卡片时顺手动 reader
- 修滚动时顺手改数据流

把边界先写清楚，后面执行会更快。

## 本次相关文件

- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/phases/02-library-visual-and-data-parity/02-01-PLAN.md`
- `.planning/phases/02-library-visual-and-data-parity/02-02-PLAN.md`
- `.planning/phases/02-library-visual-and-data-parity/02-03-PLAN.md`
