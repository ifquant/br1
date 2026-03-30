# 0073：让独立阅读窗真正吃满布局宽度

这次修的是一个很容易被忽略、但影响非常大的布局 bug：`reader` 新窗口看起来像是“左边有目录，右边一大片空白”，表面像正文没渲染，实际上是**最外层 grid 还在按主应用布局分列**，把阅读页整个塞进了左边那一列。

## 现象是怎么暴露出来的

我们用 Tauri WebDriver 做了一个临时检查，发现：

- 窗口实际宽度接近 `980px`
- 但是 `.workspace` 的宽度只有 `220px`
- `foliate-view` 和 `.engine-stage` 也跟着只剩一小条宽度

这说明问题不是“EPUB 没打开”，而是**reader window 的主容器根本没拿到全宽**。

## 根因

在 [`+layout.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/+layout.svelte) 里，`.app-frame` 默认是：

```css
grid-template-columns: 220px minmax(0, 1fr);
```

这本来是给主应用壳子准备的：

- 左边是 side rail
- 右边是主内容

但到了 `reader window` 模式，side rail 已经被条件渲染去掉了，只剩一个 `main`。  
CSS Grid 在这种情况下会把唯一的子元素放进**第一列**，于是整个 reader 页面就被装进 `220px` 那一列。

这就是为什么你会看到：

- 左边目录正常
- 右边像“空白”
- 实际正文宽度被压到极小

## 这次改了什么

### 1. 在 layout 层为 `reader window` 单独收成单列

在 [`+layout.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/+layout.svelte) 里增加：

```css
.app-frame:has(.reader-window-main) {
  grid-template-columns: minmax(0, 1fr);
}
```

这一步的意思是：

- 只要当前主内容是 `reader window`
- 整个 `app-frame` 就不要再沿用“左 rail + 主内容”的两列模型
- 直接退成单列

### 2. 给关键容器补足 `width: 100%`

这次还补了几处显式宽度：

- `.app-root.reader-window-root`
- `.app-frame`
- `.app-main.reader-window-main`
- `.reader-shell`
- `.workspace`

这些规则的作用不是“硬修 CSS”，而是避免阅读窗继续依赖浏览器对 block/grid 宽度的默认推导。  
在复杂壳层和新窗口场景下，显式写出 `width: 100%` 更稳。

## 这次能学到的具体知识

### 1. Grid 容器少了一个子元素后，布局含义可能完全变掉

你以为自己只是“隐藏了左侧栏”，但如果 grid 还是两列，而左侧栏 DOM 已经不存在：

- 主内容不会自动跑到第二列
- 它会落到第一列

所以“条件隐藏一个 panel”时，要同时检查：

- DOM 变没变
- grid template 有没有同步切换

### 2. “看起来像内容没渲染” 很多时候其实是上层布局塌缩

这次 EPUB 并不是没打开。  
真正的问题是：

- `foliate-view` 已经挂上了
- `foliate-paginator` 也创建了
- 但它们的宿主列宽被压扁了

调试这类问题时，先查这些尺寸往往比盯业务逻辑更快：

- `window.innerWidth`
- 外层 layout rect
- 内容列 rect
- 渲染宿主 rect

## 这次如何验证

我实际跑了：

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
```

结果：

- `PASS`
- `svelte-check found 0 errors and 0 warnings`

另外还跑了临时的 Tauri WebDriver 检查，确认修复前后差异：

- 修复前：`.workspace` 宽度约 `220px`
- 修复后：`.workspace` 宽度约 `966px`

## 还没处理的部分

- 这一步修的是“新窗口正文列被 layout 塞进 220px”的问题
- 没有处理 `pdf` 调试链
- 也没有把临时的 WebDriver 诊断脚本纳入正式测试套件
