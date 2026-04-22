# 0414 - 把 grouped browse 的 guard availability 接到 UI

## 背景

上一刀已经给 grouped browse 建了 guard matrix。

但如果 guard 只存在于 navigation module 里，而 UI 仍然把所有动作都渲染成“可点”，那用户看到的仍然是：

- 点一下
- 什么都没发生

这对于一个强调结构化 browsing 的 library surface 来说不够好。

## 这次做了什么

这次没有继续扩 action 语义，而是把已经存在的 guard availability 真正接到 grouped browse UI：

1. [`src/lib/components/library/LibraryHeader.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryHeader.svelte) 现在支持 breadcrumb 和返回按钮的 availability
2. [`src/lib/components/library/LibraryBrowseNavigator.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryBrowseNavigator.svelte) 现在支持 path chip 和 sibling chip 的 availability
3. [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte) 用 shared guard matrix 计算这些 controls 的 disabled 状态
4. route 里的正文 sibling buttons 也同步接上相同 guard 判断

## 为什么这一步重要

### 1. guard 第一次真正进入产品面

之前 guard 是模型层事实。  
现在 guard 开始变成用户能感知到的产品行为：

- 当前能点什么
- 当前不能点什么

这意味着 grouped browse 不再只是“点了以后再看会不会被拦”，而是开始在 UI 上提前表达导航边界。

### 2. 这让 header、navigator、正文 sibling controls 说的是同一套话

如果这些地方各自决定 disable 规则，很快就会再次分叉。

这次的关键不是“加 disabled 属性”本身，而是：

- 所有这些地方都从同一套 guard matrix 读 availability

所以 grouped browse 的主导航 chrome 终于开始共享同一个语义来源。

### 3. 这比继续只做内部架构更接近真正的大粒度对齐

前几刀主要在收内部导航模型。  
这刀的意义在于把那套模型第一次反映到用户可见层。

这样 grouped browse 的对齐就不再只是代码结构更好，而是产品行为也更一致了。

## 结果

现在 grouped browse 已经同时具备：

- shared navigation model
- shared guard matrix
- shared transition table
- shared transition result
- UI-visible guard availability

这让 `br1` 的 grouped library browse 更像一个真正的导航系统，而不是页面里堆出来的一串层级入口。

## 验证

- `pnpm check`（PASS）
- `git diff --check`（PASS）

## 未覆盖项

- 这次还没有把所有 pivot / subgroup / ancestor entry 都统一接进 availability surface
- disabled controls 目前只是静态禁用，没有配套原因提示
- grouped browse 的 guard matrix 仍然只覆盖当前已有动作，不是完整的多层 navigation policy system
