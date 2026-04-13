# 0175 把 library 拆成 continue reading 和最近阅读两个正式分区

## 这次改动做了什么

这一步开始执行 `03-01`，目标是先把书库首页最核心的阅读分区规则收紧。

主要变化有三件：

1. `ContinueReadingShelf.svelte` 不再只适合“继续阅读”
   - 新增了：
     - `sectionDescription`
     - `primaryActionLabel`
   - 这样同一套行式组件就可以同时承载：
     - `继续阅读`
     - `最近阅读`
2. `library/+page.svelte` 现在把阅读记录拆成两层
   - `continueReadingBooks`
     - 只保留真正的在读书
     - 已读完的不再混进去
     - 上限收成 3 本
   - `recentReadingBooks`
     - 保留最近打开过、但当前不在 continue reading 队列里的书
     - 上限收成 6 本
3. 主书架会排除这两个分区里的重复条目
   - 避免同一本书同时出现在多个 section 里

## 为什么这一步重要

之前的 library 顶部虽然已经有一块 `continue reading`，但规则还是松的：

- 只要有 `lastOpenedAt` 就可能进去
- 已读完的书也可能混在“继续阅读”里
- “最近读过但现在不一定继续读”的书没有独立位置

这会让 library 顶部像一个“最近碰过什么”的混合区，而不像一个成熟阅读器的首页。

这次改完后，顶部至少被拆成了两个不同语义：

- `继续阅读`
  - 当前真正处于阅读中的书
- `最近阅读`
  - 最近看过，但不属于当前继续阅读队列的书

这让用户更容易理解：

- 为什么这本书在最上面
- 为什么那本书不在 continue reading，而在 recent

## 你可以学到的工程知识

### 1. “最近做过”和“当前正在做”通常不是同一个集合

很多产品一开始会偷懒，把“最近打开过”直接等于“继续做”。

但这两个语义其实差很多：

- 最近打开过：
  - 可能只是看了一眼
  - 可能已经读完
  - 可能是误点
- 当前正在做：
  - 需要继续推进
  - 应该优先展示

把这两个集合拆开，首页的信息密度会明显更合理。

### 2. section 规则要先于视觉规则被固定

如果不先定义：

- 哪些书属于 continue reading
- 哪些书属于 recent reading
- 同一本书是否允许在多个 section 重复出现

后面无论你把卡片调得多像 Readest，用户都会觉得首页逻辑很乱。

这说明一个非常实用的原则：

- 首页 section 的 membership rule
- 往往比卡片样式更值得先锁

## 本次相关文件

- `src/lib/components/library/ContinueReadingShelf.svelte`
- `src/routes/library/+page.svelte`
