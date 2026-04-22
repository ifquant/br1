# 0417 - 给 grouped browse 增加 inline guard hints

## 背景

上一刀已经把 grouped browse 的 disabled actions 接上了 shared guard reason。

但那一层仍然主要靠：

- `title`
- hover
- 原生 tooltip

这意味着系统已经知道“为什么不能点”，但页面本身还没有一块更稳定、更可见的解释面。

## 这次做了什么

这次把 reason presentation 从 hover hint 再推进到 inline explanation：

1. 新增 [`src/lib/components/library/LibraryBrowseGuardHint.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryBrowseGuardHint.svelte)
2. [`src/lib/components/library/LibraryHeader.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryHeader.svelte) 现在会在 grouped path 区域显示 inline guard hint
3. [`src/lib/components/library/LibraryBrowseNavigator.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryBrowseNavigator.svelte) 现在也会在导航面里显示 inline guard hint
4. [`src/lib/components/library/BookshelfPreview.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/BookshelfPreview.svelte) 现在会在 grouped shelf 里显示 blocked group-entry 的 inline hint
5. 这些 hint 仍然统一来自 shared guard reason，而不是各组件自己造文案

## 为什么这一步重要

### 1. grouped browse 终于不再只靠 hover 才能解释 blocked state

如果 explanation 只在 tooltip 里，移动端、触控端、或者只是快速扫页面时都不稳定。

inline hint 的意义在于：

- 页面自己开始承认“这里有 blocked navigation”
- 用户不需要猜，也不需要先悬浮

这比只补 `title` 更接近真正的产品行为。

### 2. shared guard model 现在真正进入了 section-level copy

之前 shared guard 主要驱动：

- action availability
- disabled state
- reason labels

这一刀之后，它还开始驱动：

- section-level explanatory copy

这意味着 grouped browse 的 explanation layer 也开始和 shared navigation semantics 用同一个来源，而不是重新手写另一套说法。

### 3. 这是从“按钮状态一致”走向“界面解释一致”的一步

前几刀解决的是：

- 哪些按钮应该禁用
- 为什么禁用

这刀解决的是：

- 页面上怎么把这件事说出来

对于一个结构化 browse surface，这种 explanation consistency 本身就是一部分产品对齐。

## 结果

现在 `br1` 的 grouped browse 已经具备更完整的一条链：

- shared guard matrix
- shared availability
- disabled affordances
- shared reason labels
- inline guard hints

也就是说，grouped browse 的 blocked navigation 已经开始从内部规则演进成真实的页面语义。

## 验证

- `pnpm check`（PASS）
- `git diff --check`（PASS）

## 未覆盖项

- 这次的 inline hint 仍然是比较轻量的 section-level 提示，不是更丰富的 contextual help 面板
- 还没有针对不同 blocked action family 做更细的 explanation wording
- grouped browse 仍然可以继续把剩余次级入口统一到同样的 inline explanation policy
