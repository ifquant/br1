# 0415 - 把 grouped browse 的 availability 扩到 pivots 和 subgroups

## 背景

上一刀已经把 grouped browse 的 guard availability 接到了最核心的 navigation chrome：

- header breadcrumb
- 返回按钮
- navigator path chips
- navigator sibling chips
- 正文里的 sibling controls

但剩下几类关键入口还没接进去：

- 当前分组 overview 里的 pivots
- ancestor landing 里的“回到这一层”
- ancestor / current subgroup shelves 里的 group cards

这会导致 grouped browse 还是存在一类不一致：

- 有些入口会提前 disable
- 有些入口还是“点了以后再看会不会被 guard 拦住”

## 这次做了什么

这次把 availability surface 继续铺开到这些剩余的主要 browse 入口：

1. [`src/lib/components/library/BookshelfPreview.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/BookshelfPreview.svelte) 新增 `onEnterGroupAvailable`
2. 当前 group 的 subgroup shelves 现在会按 shared guard matrix 决定 group cards 是否可进入
3. ancestor landing 里的 subgroup shelves 也会按 shared guard matrix 决定 group cards 是否可进入
4. ancestor landing 的 `回到这一层` 按钮接上 jump-trail availability
5. current overview 的 pivot buttons 也接上 enter-group availability

## 为什么这一步重要

### 1. grouped browse 终于不再只有“部分入口”理解 guard

如果只有 header 和 navigator 知道 guard，而正文里的 subgroup / pivot 还不知道，那整体体验仍然是分裂的。

这刀的真正价值在于：

- 主要 grouped-browse 入口开始共用同一套 availability surface

所以用户不再需要靠“试着点一下”来分辨某个入口是不是当前可用。

### 2. BookshelfPreview 终于加入了 grouped-browse availability contract

之前 `BookshelfPreview` 只知道：

- 如果点了 group card，就发 `onEnterGroup`

现在它也开始知道：

- 这个 group card 当前是否应该允许进入

这很关键，因为 `BookshelfPreview` 已经是 grouped browse 很多入口的承载组件。  
把 availability contract 拉进来以后，后面更多 grouped surfaces 也能复用同一套模型。

### 3. 这一步比继续只做内部导航抽离更接近产品层对齐

前几刀主要在把 navigation 语义做扎实。  
这刀的意义是把那套语义继续铺到用户真的会点的入口上。

也就是说，grouped browse 的一致性开始从代码结构走向真实交互行为。

## 结果

现在 `br1` 的 grouped browse 已经有了更完整的 availability surface：

- header
- navigator
- sibling controls
- pivot buttons
- ancestor re-entry
- subgroup group cards

这意味着 major grouped-browse affordances 已经开始共享同一套 guard 语义，而不是一部分 disable、一部分 silent-fail。

## 验证

- `pnpm check`（PASS）
- `git diff --check`（PASS）

## 未覆盖项

- 这次还没有给 disabled browse actions 补“为什么不可用”的提示
- 还没有把 every single grouped-browse entry 做到完全统一的 availability treatment
- availability 仍然主要是布尔禁用，不是更丰富的 capability presentation system
