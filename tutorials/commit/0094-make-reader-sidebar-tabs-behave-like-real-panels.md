# 0094: 让 reader sidebar 的 tabs 变成真实 panel

这次提交不是继续修样式，而是把 `reader` 左侧栏里原来只是装饰的 `目录 / 搜索 / 笔记` 三个 tab，推进成真正会切换内容的 panel。这样 `br1` 的 `reader sidebar` 会更接近 `Readest` 的 `SideBar` 结构，而不是一块永远只显示 TOC 的静态壳。

## 为什么要这样做

之前的 `ReaderSidebar.svelte` 虽然视觉上已经像一个侧栏，但行为上还不够像产品：

- `目录 / 搜索 / 笔记` 只是三个静态标签
- `搜索` 不能切到搜索 panel
- `笔记` 也没有单独的 panel surface

这会让用户一眼看出这还是 placeholder。`Readest` 的做法不是“左边总有一份 TOC”，而是把 sidebar 当成一个真正的 panel system。

## 这次改了什么

改动文件：
- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte`

实现点：

1. 增加 `activeTab`

```ts
type SidebarTab = 'toc' | 'search' | 'notes';

let activeTab: SidebarTab = 'toc';
```

这样 sidebar 不再是单一内容区，而是一个最小 panel 状态机。

2. 把 tab 从静态 `<span>` 改成真正的 `<button role="tab">`

这一步的价值不只是“能点”，还包括：

- 语义更正确
- 后续更容易接可访问性
- 更像真实组件，而不是 mock

3. 给 `搜索` 做最小可用 panel

现在 `搜索` panel 里有：

- 搜索输入框
- 当前 TOC 的过滤结果
- 点击结果后回到 `目录` 并跳到对应章节

注意：
- 这里还不是全文搜索
- 只是先拿现有 TOC 做最小真实行为

这是一种很常见的渐进式实现方式：先复用已有数据结构，把面板行为跑通，再往下接真正搜索。

4. 给 `笔记` 做最小 notes surface

`笔记` panel 先不接真实 annotations store，而是：

- 从当前 TOC 派生几个 note preview
- 把 panel 结构、卡片节奏、文案语气先摆正

这样后续接真实高亮/笔记数据时，不需要再重做外壳。

## 这里对应的编程知识

### 1. “状态驱动视图切换”比“复制三块 UI”更稳

这次最小核心其实就是：

```ts
let activeTab: SidebarTab = 'toc';
```

然后在模板里：

```svelte
{#if activeTab === 'toc'}
  ...
{:else if activeTab === 'search'}
  ...
{:else}
  ...
{/if}
```

这是前端里非常基础但很重要的一种结构：

- 状态只有一个来源
- 视图跟着状态切换
- 不需要手工控制很多 DOM show/hide

当 panel 数量变多时，这种写法会比“每个区块自己维护是否显示”更稳定。

### 2. 先做“最小真实行为”，比长期保留静态 placeholder 更值钱

这次 `搜索` 没有一下子接正文全文搜索，而是先用：

```ts
toc.filter((item) => item.label.toLowerCase().includes(...))
```

这么做的价值是：

- 用户能立刻感受到 panel 是真的
- 工程上不需要立刻引入新的索引层
- 后面换成真正搜索时，外层 UI 不用重写

这是一种很实用的产品工程策略：

- 外壳先做成真的
- 数据先用最小可用来源
- 再逐层替换成正式实现

## 我实际怎么验证

我实际跑了：

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
git -C /Users/dev/workspace2/hc_apps/br1 diff --check
```

结果：

- `pnpm check`：PASS
- `git diff --check`：PASS

## 这次还没做的

- `搜索` 还不是全文搜索，只是 TOC filter
- `笔记` 还是最小 preview，还没接真实 annotations/notebook 数据
- 还没有把这些 tab 状态和快捷键、header actions 进一步联动
