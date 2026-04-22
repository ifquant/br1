# 0406 - 把 grouped browse navigator 抽成 library 组件

## 背景

上一刀已经把 grouped browse 的关系收成了一个独立 navigator surface：

- 当前路径
- 同层切换
- 跨维继续看

但实现层面它还完全长在 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte) 里。  
这意味着产品结构虽然已经比以前清楚了，代码结构却还没跟上。

## 这次要补什么

这次不再新增新行为，而是把已经成立的导航面收成独立组件：

1. 新增 [`src/lib/components/library/LibraryBrowseNavigator.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryBrowseNavigator.svelte)
2. 把 navigator 的展示结构和样式一起搬进去
3. 通过 props 接收：
   - 当前 group 摘要
   - trail
   - sibling groups
   - pivots
   - 对应的导航回调
4. 在 `src/lib/components/index.ts` 暴露这个组件，library route 只负责准备数据和接线

## 为什么这一步重要

### 1. page-local UI 继续长下去，就会开始反向拖累对齐速度

到这个阶段，继续把 grouped browse 的导航逻辑堆在 route 里，会越来越难再往 graph/model 方向推进。  
先把 navigator 单独抽出来，后面无论要：

- 继续做 graph model
- 在别的 surface 复用
- 单独测导航行为

都会轻得多。

### 2. 产品分层和代码分层终于对上了

现在信息架构里已经明确有：

- header
- navigator
- ancestor landing
- current landing
- bookshelf

如果代码里 navigator 还只是 route 模板的一大坨 markup，那产品层级和代码层级就是错位的。  
这一刀做的事情就是把两者重新对齐。

### 3. 这是一刀“为下一步继续大粒度对齐让路”的整理

这次不追求用户立刻看到新按钮，而是把已经验证过的导航面变成更可演进的单元。  
对这种连续对齐工作来说，这类整理不是可有可无，而是下一步还能继续加速的前提。

## 结果

现在 `br1` 的 grouped browse navigator 已经不再是 route 局部实现，而是：

- 一个明确的 library 组件
- 有清晰的输入和事件边界
- route 只负责组装导航数据和动作

这让后续继续把 grouped browse 往真正的 graph/navigation model 推进时，不必再先清理 route 里的大段模板。

## 验证

- `pnpm check`（PASS）
- `git diff --check`（PASS）

## 未覆盖项

- 这次没有补 dedicated e2e 去断言新组件本身的交互
- navigator 的数据模型目前仍然由 route 拼装，不是独立 store/model
- 还没有继续把 ancestor/sibling/graph 关系抽成统一的 navigation domain object
