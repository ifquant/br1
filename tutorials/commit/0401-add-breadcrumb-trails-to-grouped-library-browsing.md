# 0401 - 给 grouped library browsing 补 breadcrumb trail

## 背景

前一刀已经把 active group landing 从“摘要 + pivot 按钮”推进成了“摘要 + subgroup shelves”。

这意味着 grouped browse 已经不再只是：

- 进入一个组
- 看完就退回整库

而是开始允许：

- 进入一个组
- 在当前组里再按别的维度继续拆
- 继续进入下一层组

问题是，导航模型还停在旧状态：header 里只有一个 `返回整库`。  
一旦用户在作者组里又跳去某个归类组，或者再从归类组跳去格式组，界面虽然已经允许这么浏览，但路径感还是断的。

## 这次要补什么

这次补的不是更多 landing 内容，而是 grouped browse 的路径语义：

1. 把当前 grouped browse 的祖先路径存进 route state
2. active group 下钻时，不只切当前 `groupBy/group`，还把当前层压进 trail
3. header 不再只显示“当前组”，而是显示一条 breadcrumb-like trail
4. `返回整库` 在有祖先时变成 `返回上一级`
5. 祖先 breadcrumb 还能直接点回某一层

也就是说，这次收的是 browse hierarchy 的“路”，不是 browse hierarchy 的“内容”。

## 改动概览

- 在 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte) 里新增 `LibraryGroupSegment`
- 新增 `trail` 的 URL 读写逻辑，用 JSON 序列化当前 browse ancestors
- `handleEnterLibraryGroup(...)` 和 `handleLibraryGroupPivot(...)` 在 active group 下继续下钻时会把当前组压进 trail
- `handleExitLibraryGroup(...)` 改成优先回到 trail 的上一层，而不是一律清空到整库
- 在 [`src/lib/components/library/LibraryHeader.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryHeader.svelte) 里增加 ancestor chips 和 jumptrail 事件

## 为什么这一步重要

### 1. 层级浏览必须有路径记忆

如果产品允许：

- 作者 -> 归类 -> 格式

但 header 只会说：

- 你现在在格式组
- 回整库

那它本质上还是单层 browse，只是碰巧支持了几次跳转。  
真正的 hierarchy 不只是能往下走，也要知道自己是怎么走下来的。

### 2. breadcrumb 比更多 landing 指标更值

到这个阶段，再往 landing 里加摘要、数字、按钮，收益已经在下降。  
更值得补的是：

- 路径感
- 祖先关系
- 返回语义
- 任意一层的回跳

这才是 grouped browse 从“多个局部跳转”变成“一个连续浏览模型”的关键。

### 3. 仍然坚持 route-level single source of truth

这次没有在 header 里偷偷维护一套本地 trail state，而是把它继续放进 URL。这样做有几个直接好处：

- header、landing、subgroup shelf 共享同一份路径事实
- scroll context 也能区分不同的 trail
- 刷新后路径语义仍然成立
- 不会冒出“视觉上有 breadcrumb，但实际路由并不知道”的伪层级

## 结果

现在 `br1` 的 grouped library browsing 已经不只是：

- 顶层 group cards
- 进入当前 group
- 看 overview
- 用 subgroup shelves 继续往下拆

而是进一步变成：

- 顶层 group cards
- 进入当前 group
- 沿 subgroup shelves 继续下钻
- header 保留祖先 trail
- 可以逐级返回，也可以点任意祖先回跳

这让 grouped browse 开始真正有了 hierarchy 的骨架，而不是一串互相能跳的局部页面。

## 验证

- `pnpm check`（PASS）
- `git diff --check`（PASS）

## 未覆盖项

- 这次没有补 dedicated e2e 去断言 breadcrumb 回跳路径
- 当前 trail 还是基于显式跳转积累，不是自动推导的完整 browse graph
- 还没有把 breadcrumb 继续扩成真正的多级 landing / tree 导航
