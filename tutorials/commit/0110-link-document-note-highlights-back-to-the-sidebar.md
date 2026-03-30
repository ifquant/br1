# 0110：让正文里的 note 高亮反向定位到 sidebar

上一个切片已经把 note 高亮真正画回正文了，但还差最后一段体验闭环：

- 你能在正文里看到高亮
- 但点击这个高亮时，sidebar 还不会自动定位到对应 note

这次补的就是这条“从正文回到笔记系统”的回路。

## 这次做了什么

1. 在 [/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte) 里监听 `show-annotation`
2. 当被点击的 annotation 带有 `foliate-note:` 前缀时，向上派发 `notefocus(cfi)`
3. 在 [/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte](/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte) 里：
   - 切到 `notes` tab
   - 展开 sidebar
   - 记住当前激活的 note CFI
4. 在 [/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte) 里：
   - 高亮匹配 note
   - 自动滚到可见区

## 为什么这一步重要

如果没有这条反向链，正文高亮和 sidebar note 虽然都存在，但还是两个松散功能。  
真正像阅读器的体验应该是：

- 从 sidebar 点 note，能回正文
- 从正文点高亮，也能回 sidebar

这样用户才会把它感知成同一个 annotation 系统。

## 这次可以学到的两个点

### 1. 事件语义要用“领域信号”，不要直接传 UI 动作

这里 `ReaderViewport` 没有直接说“请 sidebar 滚动到某个卡片”，而只是发：

```text
notefocus(cfi)
```

这就是一个领域信号：  
“当前有一个 note 被聚焦了。”

route 再决定：
- 切 tab
- 展开 sidebar
- 更新 active note

这样层次更清楚，也更容易复用。

### 2. 自动滚动最好做成“只在目标变化时触发”

如果每次渲染都无脑 `scrollIntoView()`，界面会很抖。  
所以这次 sidebar 里保留了 `lastScrolledNoteCfi`，只有目标 note 真变了，才触发滚动。

## 实际验证

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## 这次没做的

- 还没有点击高亮后自动展开 note 详情
- 也还没有把正文里的当前高亮与 sidebar 做双向 hover/hover-preview 联动
