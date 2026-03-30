# 0107：在 reader 选择链上补一个最小可用的 notes 流程

这次改动的目标不是一次做完整的高亮系统，而是先把 `notes` 从 placeholder 变成真正可用的阅读能力。

最后形成的链路是：

- 在正文里选中一段文本
- 切到 `笔记` 面板
- 点击“为当前选中内容记笔记”
- 笔记会按“每本书一个 key”存到本地
- 点击笔记会回跳到原来的 `CFI`

## 这次为什么这样做

`Readest` 的成熟感不只是目录和搜索，还有 annotator / notebook 这条链不是空的。  
但完整的高亮、颜色、导出、批注编辑是一个更大的系统。先把最小 notes 路打通，后面再往上堆，就不会一直停留在假 UI。

## 这次具体做了什么

1. 在 [/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte) 里监听正文文档的 `selectionchange`
2. 用 `foliate-view.getCFI(index, range)` 把当前选择转成稳定定位
3. 让 `ReaderStage -> +page.svelte` 接住当前选择状态
4. 在 [/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte](/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte) 里把 notes 存到 `localStorage`
5. 在 [/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte) 里把 `notes` tab 改成真实列表，而不是示意文案

## 这次可以学到的两个点

### 1. 选择状态最好从阅读引擎往上派，不要让 sidebar 自己猜

`sidebar` 看不到正文里的真实 `Range`，也不知道该怎么转成 `CFI`。  
真正知道“当前选中了什么”的是 `foliate-view` 这一层，所以应该由它发 `selectionchange`，再让 route 统一持有状态。

### 2. 最小持久化先按“每本书一个 key”做，通常比先建大而全 store 更稳

这次 notes 先存在：

```text
br1.reader.notes:<sourcePath | sourceUrl | sourceLabel>
```

这让你可以很快验证：
- 同一本书下次打开笔记还在
- 不同书之间不会串

等后面真的做成 `Readest` 那种 book config / annotations store，再把这层替换掉也比较自然。

## 实际验证

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## 这次没做的

- 还没有真正的 highlight/annotation 绘制
- 笔记目前只做本地持久化，没有同步到 `library.json` 或更完整的 book config
- 也还没有删除、编辑、颜色、导出这些更完整的 annotator 行为
