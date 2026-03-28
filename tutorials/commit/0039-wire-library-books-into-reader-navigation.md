# 0039: 把 library 书卡接到 reader 导航

这次提交补的是最关键的一条产品动线：`library -> reader`。

之前 `br1` 虽然已经有了 `/reader` 路由，也已经能打开样例书和本地文件，但用户必须先知道有这个页面，或者手动切过去。这和 `Readest` 的习惯不一样。`Readest` 的做法是：用户在书架里点一本到书，`library` 负责把他送进 `reader`。

所以这一刀的目标不是继续增强 reader 引擎，而是把入口搭正：

- 让 `library` 里的书卡本身变成阅读入口
- 给 `reader` 一个最小 URL 驱动能力
- 让 `/reader?source=sample` 能自动打开样例书

## 这次做了什么

1. 给书卡模型加上 `readerHref`

在 [`BookshelfPreview.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/BookshelfPreview.svelte) 里，书的数据类型原来只有标题、作者、状态和封面。现在补了一个可选的 `readerHref`。

这样组件层不用知道“怎么导航”，只需要知道“这本书能不能点，点了去哪里”。

2. 把书卡从静态内容改成可点击入口

这次用了 `<svelte:element>`：

- 有 `readerHref` 时渲染成 `<a>`
- 没有 `readerHref` 时退回 `<div>`

这样一个组件就能同时支持：

- 纯展示卡
- 可点击的导航卡

同时也补了 `focus-visible`，避免键盘用户完全看不见当前焦点。

3. 让 `reader` 认识 `source=sample`

在 [`src/routes/reader/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte) 里，新增了对 URL query 的最小解析：

- 当 `source === sample`
- 就发一个 `{ type: 'sample' }` 的控制请求

这样 reader 页在被 library 打开时，就不只是“展示一个壳”，而是能自动走到样例书打开状态。

4. 给 reader 控制通路补一个 `sample` 指令

在 [`types.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/reader/types.ts) 里，`ReaderControlRequest` 新增了 `sample`。

然后在 [`ReaderViewport.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte) 里把它接到 `loadSampleBook()`。

这样 `sample`、`file`、`prev/next`、`fraction` 都走同一条控制通路，而不是单独给“自动打开样例书”再开一条旁路。

## 你可以学到的具体知识

### 1. 为什么这里适合用 `<svelte:element>`

`<svelte:element>` 适合处理“标签本身要变，但内部结构想复用”的场景。

这里如果不用它，常见写法会变成：

- 一份 `<a> ... </a>`
- 再复制一份 `<div> ... </div>`

这样内部结构会重复，后面改卡片内容时很容易两边不同步。

而 `<svelte:element this={condition ? 'a' : 'div'}>` 的好处是：

- 标签可切换
- 内部 DOM 只写一份
- 样式和层级更容易统一

### 2. 为什么把“自动打开样例书”做成控制请求，而不是 page 直接调用组件方法

因为 page route 不应该直接伸手去操作子组件实例的方法。

这次仍然沿用了前面已经建立的思路：

- page 负责解释 URL 和页面级状态
- workspace / viewport 负责具体执行 reader 控制

这样页面层只关心“我要发什么命令”，而不是“底层引擎怎么打开书”。

这就是典型的 **composition layer 和 engine layer 分离**。

## 实际影响

现在 `br1` 至少已经具备了最小的 Readest 式入口：

- 在 `library` 点书
- 进入 `reader`
- 自动打开样例书

这还不是真实书库系统，但产品动线已经从“两个孤立页面”变成了“一条能走通的阅读路径”。
