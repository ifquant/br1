# 0051: 修复独立阅读窗里主舞台没有撑满整列的问题

## 背景

虽然右侧 `bridge` 已经在独立阅读窗里收起来了，但界面仍然看起来不对：

- 左边 sidebar 正常
- 中间只有一小块内容
- 右边大片空白

这说明问题不只是“列宽分配”，而是**reader 主列里的内容本身没有撑满整列**。

## 这次做了什么

1. 更新 [reader/+page.svelte](/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte)

- 把 `window-mode` 的 grid 写成 `minmax(208px, 224px) minmax(0, 1fr)`
- 明确告诉布局：左栏有边界，正文列应该吃掉剩余宽度

2. 更新 [ReaderWorkspace.svelte](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderWorkspace.svelte)

- 给 `reader-workspace` 和 `canvas` 都加上 `width: 100%`
- 避免它们只按内容宽度收缩

3. 更新 [ReaderViewport.svelte](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte)

- 给 `viewport-shell`、`viewport-frame`、`engine-host` 显式加 `width: 100%`
- 把空态按钮从下面的说明区挪到 `engine-stage` 中央，用 overlay 方式渲染
- 在 `window-mode` 下直接隐藏下面那块说明 copy，避免你看到“一小块卡片 + 大片空白”

## 关键知识

### 1. Grid 正确分列，不代表子节点一定会自动把整列撑满

很多时候外层 grid 已经是：

```css
grid-template-columns: 220px minmax(0, 1fr);
```

但内层组件如果没有：

- `width: 100%`
- 或者本身仍然按内容宽度收缩

用户看到的就会像“第二列还是只占一小块”。  
所以排查 grid 布局问题时，要看两层：

- 外层列怎么分
- 内层组件有没有真的把列吃满

### 2. 空态按钮放在主舞台下面，用户会误以为“中间是空的”

如果主舞台已经很高，而按钮和说明文案还排在它下面，用户第一眼看到的就是：

- 一大块空白
- 没有明显动作入口

更好的做法是：

- 在主舞台中心放一个轻量 overlay
- 让动作就长在用户目光会落到的区域里

这不是单纯的美化，而是直接决定用户能不能理解“下一步该做什么”。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做

- `reader` 主舞台还没有完全对齐 `Readest` 的真实阅读器 chrome
- `bridge` 仍然只是默认隐藏，还没做成真正的折叠 panel
