# 0416 - 给 disabled grouped browse actions 补 guard reason 提示

## 背景

上一刀已经把 grouped browse 的 availability 扩到了：

- header
- navigator
- sibling controls
- pivots
- ancestor re-entry
- subgroup group cards

但 disabled 本身还不够。  
如果用户只能看到“这个按钮灰了”，却不知道为什么灰，那这层 guard 语义仍然没有完整进入产品面。

## 这次做了什么

这次继续把 shared guard model 往用户可感知层推进：

1. 在 [`src/lib/library/navigation.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/navigation.ts) 新增 shared invalid-reason label helper
2. route 里新增一组 reason-label helper，用同一套 guard matrix 生成原因文案
3. [`src/lib/components/library/LibraryHeader.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryHeader.svelte) 现在支持 breadcrumb 和返回按钮的 reason label
4. [`src/lib/components/library/LibraryBrowseNavigator.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryBrowseNavigator.svelte) 现在支持 path / sibling / pivot 的 reason label
5. [`src/lib/components/library/BookshelfPreview.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/BookshelfPreview.svelte) 现在支持 grouped entry card 的 reason label
6. route 里的 ancestor re-entry / sibling / pivot controls 也都接上相同来源的 reason text

## 为什么这一步重要

### 1. guard 终于不只是系统知道，也开始让用户知道

之前系统知道：

- 为什么这个动作被 block

但用户只看到：

- 这个动作灰了

现在两边终于开始对齐。  
虽然目前还是比较轻量的 `title` 提示，但最核心的一步已经完成了：

- disabled action 不再是“无解释的 disabled”

### 2. 这让 shared guard model 真正成为产品 contract

如果 reason 文案散在组件里，那还是会继续分叉。

这次关键点在于：

- reason label 也从 shared navigation/route helper 来

于是 grouped browse 的产品层信息开始和它的内部 guard 语义共享同一个来源。

### 3. 这比继续只铺 availability 更进一步

availability 解决的是：

- 能不能做

reason label 解决的是：

- 为什么不能做

这一步把 grouped browse 从“知道什么时候禁止”推进到了“开始解释禁止的原因”。

## 结果

现在 `br1` 的 grouped browse 已经开始具备一条更完整的交互链：

- action
- availability
- disabled UI
- reason label

这让 grouped browse 的 guard 语义真正开始进入用户体验，而不再只是代码里的导航规则。

## 验证

- `pnpm check`（PASS）
- `git diff --check`（PASS）

## 未覆盖项

- 这次仍然主要用轻量提示，没有做更强的 inline explanation UI
- reason 文案目前仍然比较通用，没有按具体 action 做更细的差异化表达
- grouped browse 的所有次级入口还可以继续统一到同样的 reason presentation policy
