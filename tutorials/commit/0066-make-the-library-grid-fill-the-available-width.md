# 0066：让书库网格真正铺满可用宽度

这次修的是一个典型的书架布局问题：窗口明明很宽，但书卡只挤在左边几列，右边留一大片空白。

根因不是书太少，而是网格轨道写死了。

之前 `BookshelfPreview` 的 `grid` 用的是固定列数和固定卡宽：

- `repeat(5, minmax(0, var(--book-width)))`

这意味着：

- 页面再宽，也只会摆固定几列
- 右边多出来的空间不会拿来继续排书

所以视觉上就会像“书架没铺满”。

## 改了什么

- 在 `/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/BookshelfPreview.svelte`
  - 把 `grid` 从固定列数改成：
    - `repeat(auto-fill, minmax(var(--book-width), 1fr))`
  - 让书卡宽度从固定值改成：
    - `width: 100%`
    - `max-width: 176px`
  - `cover-shell` 也跟着吃满卡片宽度
  - 移除了几组会继续把网格重新写死的断点规则

## 这次值得学的两个知识点

### 1. 固定列数适合“版式锁死”，不适合会伸缩的书架

如果你写的是：

- `repeat(5, ...)`

那浏览器就会老老实实只给你 5 列。  
窗口再宽，也不会神奇长出第 6 列。

而书架这类界面更适合：

- `repeat(auto-fill, minmax(...))`

这样浏览器会根据容器宽度，自动决定能摆几列。

### 2. 轨道能伸展，不代表卡片会伸展

这次另一个关键点是：

- 轨道改成自适应以后
- 卡片本身如果还是 `width: var(--book-width)`

那卡片还是不会吃满自己的 grid cell。  
所以这类布局经常要两层一起改：

1. 改 `grid-template-columns`
2. 改子项自身宽度

否则你会得到“轨道变宽了，但卡片还是缩在左边”的奇怪效果。

## 我怎么验证

实际跑过：

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` `PASS`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` `PASS`

## 还没做什么

- 这次只修了网格铺满，不涉及书架排序、过滤或拖拽
- 视图模式持久化仍然还没做
