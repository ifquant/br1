# 0418 - 按导航 surface 拆开 grouped browse 的 guard hints

## 背景

上一刀已经给 grouped browse 加了 inline guard hints。

但那一层仍然有个明显问题：

- path blocked 也好
- sibling blocked 也好
- pivot blocked 也好
- subgroup blocked 也好

最后都会掉进同一种“这里有暂不可用入口”的通用提示。

这意味着页面虽然开始解释 blocked navigation 了，但解释仍然不够像一个真正的 browse system，更像把所有失败状态压成同一句话。

## 这次做了什么

这次把 grouped browse 的 explanation layer 再往前推了一层：

1. [`src/lib/library/types.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/types.ts) 新增了 `LibraryBrowseGuardSurface` 和 `LibraryBrowseGuardExplanation`
2. [`src/lib/library/navigation.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/navigation.ts) 新增了 shared `getLibraryBrowseGuardExplanation(...)`
3. [`src/lib/components/library/LibraryBrowseGuardHint.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryBrowseGuardHint.svelte) 不再只吃扁平 `reasonLabels`，而是渲染带 `title/detail` 的 explanation entries
4. [`src/lib/components/library/LibraryBrowseNavigator.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryBrowseNavigator.svelte) 现在把 path / sibling / pivot 三类 hint 分开显示，而不是合并成一个总提示
5. [`src/lib/components/library/LibraryHeader.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryHeader.svelte) 现在直接消费 path/exit 相关的 grouped explanations
6. [`src/lib/components/library/BookshelfPreview.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/BookshelfPreview.svelte) 现在区分 top-level group card 和 subgroup shelf 两种 blocked group-entry surface
7. [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte) 负责把具体 action 映射成 surface-specific explanations，再分别传给 header / navigator / shelf

## 为什么这一步重要

### 1. grouped browse 终于开始解释“哪一类导航坏了”

之前的 inline hint 只能说：

- 这里有 blocked navigation

现在它开始能说得更像真实导航系统：

- 当前路径需要刷新
- 同层切换需要重算
- 跨维跳转需要重建
- 子层入口需要刷新
- 分组入口需要刷新

这比“一个总提示”更接近真正的产品语义。

### 2. shared guard model 不再只产出 disable/no-disable

前几刀 shared navigation model 已经有：

- action availability
- transition guards
- invalid reasons

这一刀进一步让它开始产出：

- surface-specific explanation policy

也就是说，shared model 不再只决定“拦不拦”，还开始决定“被拦住以后页面应该怎么解释”。

### 3. route 不再自己发明每块 UI 的 blocked copy

如果没有这一步，后面的自然退化是：

- header 自己写一套 blocked copy
- navigator 自己写一套
- subgroup shelf 再写一套

结果就是 grouped browse 的 guard semantics 又会重新碎回 page-local 文案。

现在 route 仍然只负责把 action 对上 surface，真正的 explanation wording 已经收回 shared navigation module。

## 结果

现在 `br1` 的 grouped browse explanation layer 已经从：

- shared invalid reason
- shared reason label
- generic inline hint

推进到了：

- shared invalid reason
- shared surface-specific explanation
- path / sibling / pivot / subgroup / top-level group-entry 分开的 inline hints

也就是说，grouped browse 的 blocked navigation 已经不只是“能解释”，而是开始按导航结构本身解释。

## 验证

- `pnpm check`（PASS）
- `git diff --check`（PASS）

## 未覆盖项

- 这次仍然只是在已有 guard reason 上做 surface-specific explanation，还没有更细到每一种 invalid reason matrix
- hover/title 仍然保留着轻量 reason label，并没有被新的 explanation layer 替代
- grouped browse 还可以继续把 overview 区里的更多 blocked state 做成更贴近局部上下文的 explanation placement
