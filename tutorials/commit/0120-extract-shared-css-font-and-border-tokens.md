# 背景

`br1` 这段时间在追 Readest 的 library 和 reader 视觉层，对齐过程中积累了不少直接写死的字体栈和边框色值。  
这种写法在项目起步阶段很常见，但一旦页面增多，就会出现两个问题：

- 想统一调整字体或边框强度时，要改很多散落的文件
- 代码里只看到一串字面量，看不出它代表的是“阅读字体”还是“控制栏字体”

这次提交先做一个低风险样式整理：把应用壳层、library、reader 侧边栏和控制栏里重复出现的字体栈与边框色提炼成根变量，让视觉约定变成显式 token。

# 主要目标

- 提炼 app chrome / reading serif 的共享字体变量
- 提炼常用浅边框、中边框变量
- 用变量替换多处硬编码，降低后续视觉调整成本

# 改动概览

- 在 `src/routes/+layout.svelte` 的 `:root` 中新增：
  - `--font-chrome`
  - `--font-reading`
  - `--border-light`
  - `--border-medium`
- 将 app shell、library 页面、`BookshelfPreview`、`ContinueReadingShelf`、`LibraryHeader`
  以及 `ReaderHeaderBar`、`ReaderFooterBar`、`ReaderStage`、`ReaderSidebar`、`reader/+page.svelte`
  中的重复字体栈和 `rgba(64, 47, 24, 0.08/0.12)` 替换为变量引用
- 保留 `ContinueReadingShelf` 中封面 fallback 小字使用的 `Source Serif 4`，没有强行并入通用阅读字体
- 没有触碰当前带有未提交排障改动的 `ReaderViewport.svelte`

# 关键知识

## 1. 设计 token 的价值不只是“方便替换”

很多人第一次接触 CSS 变量，会把它理解成“查找替换更方便”。这当然是收益之一，但更关键的是它让样式语义显式化。

比如下面两种写法：

```css
font-family: "IBM Plex Sans", "Helvetica Neue", "Noto Sans SC", sans-serif;
```

和

```css
font-family: var(--font-chrome);
```

第二种写法更强，因为它告诉读代码的人：  
这里不是“随便一个 sans-serif”，而是“应用控制层统一使用的字体语义”。

这会直接改善维护体验：

- 做设计对齐时，先改 token，再看哪些组件不该跟着变
- 做新组件时，可以优先复用已有语义，而不是继续复制字面量

## 2. 为什么这次要避开 `ReaderViewport.svelte`

当前工作区里的 `ReaderViewport.svelte` 已经有另一条未提交的 reader 布局排障改动。  
如果我把样式 token 改动混进去，提交历史会同时包含：

- 样式语义整理
- reader 版式排障

这会让回滚、复盘、定位回归都变困难。

一个重要的工程原则是：**不要把“顺手能改”的东西和“这次要交付的主题”混成一个提交。**

所以这次切片故意只覆盖干净文件，把 `ReaderViewport` 留在下一次独立处理。这样历史会更清楚，也更符合 `AGENTS.md` 里“一次一个清晰切片”的要求。

## 3. 为什么有些 serif 仍然可以保留局部例外

虽然新增了 `--font-reading`，但 `ContinueReadingShelf` 里封面 fallback 小字仍然保留了 `Source Serif 4`。  
这是有意为之，因为它不是正文阅读排版，而是一个很小的“封面拟物”视觉细节。

这说明 token 化不是机械统一，而是先统一大多数共享语义，再为少量有明确视觉理由的局部样式保留例外。  
真正的目标是减少无意义分叉，不是消灭所有差异。

# 验证

- `pnpm check` (PASS)
- `git diff --check` (PASS)

# 未覆盖项

- `ReaderViewport.svelte` 里的字体栈未处理，因为该文件当前存在另一条未提交的 reader 排障改动
- `src/lib/reader/foliate.ts` 内部注入的阅读器字体变量本次未调整
- 这次没有做 controller 拆分、sidebar prop 合并、library 类型统一或 Rust 模块拆分
