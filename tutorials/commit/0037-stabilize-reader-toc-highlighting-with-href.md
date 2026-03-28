# 0037: 用 `href` 稳定 reader TOC 高亮，并让当前章节滚到可见区

这一提交只解决两个很具体的问题：

1. TOC 当前项不该靠标题文本匹配  
2. 切换章节后，当前项应该尽量出现在 sidebar 的可见区里

这看起来像小修，但它会直接影响“目录导航像不像真的能用”。

## 为什么不能继续用 `label` 当 active key

上一版最小 TOC 能点了，但 active 判断还是靠：

```ts
item.label === activeLabel
```

这很脆弱。因为书里完全可能出现：

- 两个标题一样
- 标题被翻译、截断、清洗
- 当前章节 label 和 TOC label 只是“看起来一样”，但不是可靠键

而 `foliate` 在 `relocate` 里已经会把 `tocItem.href` 回传出来。  
这才是更稳定的 active key。

所以这一步改成了：

- `ReaderPreviewState` 增加 `chapterHref`
- page 组合层持有 `activeHref`
- `ReaderSidebar` 按 `item.href === activeHref` 判断 active

## 为什么这一步顺手做滚动到可见区

如果当前章节变了，但 sidebar 里高亮项在视口外，用户仍然会觉得“目录没跟上”。  
所以这一步顺手加了最小滚动逻辑：

- `activeHref` 变化
- 找到对应按钮
- `scrollIntoView({ block: 'nearest' })`

这已经足够让当前项跟着进入可见区，而不用提前做更复杂的虚拟列表或树展开。

## 改动概览

- 更新 [`src/lib/reader/types.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/reader/types.ts)
  - 给 `ReaderPreviewState` 增加 `chapterHref`
- 更新 [`src/lib/components/reader/ReaderViewport.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte)
  - 在 `readerstate` 里派发 `chapterHref`
- 更新 [`src/lib/components/reader/ReaderWorkspace.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderWorkspace.svelte)
  - 初始化 `chapterHref`
- 更新 [`src/routes/reader/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte)
  - page 组合层从 `activeLabel` 切到 `activeHref`
- 更新 [`src/lib/components/reader/ReaderSidebar.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte)
  - active 判断改成 `href`
  - 给条目加 `data-href`
  - 在 `activeHref` 变化后滚动到可见区

## 这次顺手学到的具体知识

### 1. UI 高亮应该优先绑定“稳定标识”，不是绑定显示文本

显示文本是给人看的，不一定适合当程序键。  
更稳的做法通常是：

- `id`
- `href`
- `cfi`
- 数据库主键

这条原则很通用，不只适用于阅读器。

### 2. `scrollIntoView({ block: 'nearest' })` 很适合这种“小范围跟随”

你不一定总需要复杂滚动计算。  
当目标只是“确保当前项进入可见区”，`nearest` 往往就够了：

```ts
target?.scrollIntoView({ block: 'nearest' });
```

它不会像 `start` 那样每次都把项顶到最上面，视觉上更稳。

## 验证

我实际运行了：

```bash
pnpm check
git diff --check
```

结果：

- `pnpm check`：PASS
- `git diff --check`：PASS

## 还没做的事

这一提交**没有**处理：

- TOC 树展开/折叠
- active 项的父级自动展开
- 侧栏记忆滚动位置
- 更复杂的 active 匹配策略

它只把当前章节高亮从“勉强可用”推进到“更稳定、更像产品”。 
