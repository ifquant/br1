# 0088 给 continue reading 增加详情和状态动作

这次是继续把 `continue reading` 往 `Readest` 的 `BookItem` 靠，不过重点不是照抄视觉，而是补它最值钱的两类信号：

- 阅读状态
- 详情动作

## 这次改了什么

文件：

- `/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/ContinueReadingShelf.svelte`

### 1. 从 `progressFraction` 投影出阅读状态

在 `library` 的数据投影层里，新加了：

- `readingStatusLabel`

规则很简单：

- `>= 100%` -> `已读完`
- `> 0` -> `在读`
- `= 0` -> `未开始`

这样 UI 层就不需要自己再推断状态。

### 2. 行项标题旁边增加状态 badge

`ContinueReadingShelf` 现在会在书名旁边显示一个很轻的 badge：

- `在读`
- `已读完`
- `未开始`

这更接近 `Readest` 的 `ReadingProgress / StatusBadge` 思路。

### 3. 增加 `详情` 动作

每行除了：

- `从头开始`
- `继续`

现在还多了：

- `详情`

点击后会在当前行下展开一个轻量 detail panel，显示：

- 作者
- 进度
- 当前状态
- 最近阅读时间

### 4. 用局部展开状态管理详情面板

组件内部新增：

- `expandedKey`

它让每次只展开一条详情。  
点击同一条再收起，避免列表同时展开太多内容。

## 这次能学到的 2 个编程点

### 知识点 1：详情动作不一定要跳新页面

有时候“详情”最好的形态不是 modal，也不是新 route，而是：

- 在当前列表项下局部展开一层信息

这对快速浏览很友好，也不会打断主流程。

### 知识点 2：状态最好在数据投影层统一推导

如果每个组件都自己判断：

- 多少算读完
- 多少算在读

规则很容易漂。  
更稳的做法是像这次一样，在投影层先把：

- `readingStatusLabel`

算好，再把结果交给组件。

## 这次还没做什么

- 详情动作还没有接更深的书籍 metadata
- 也还没有像 `Readest` 那样补云同步、上传下载、信息弹窗等动作

这次只先补最直接有用的详情和状态信号。
