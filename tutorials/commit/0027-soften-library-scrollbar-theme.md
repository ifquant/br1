# 0027 Soften library scrollbar theme

## 背景

前面已经把 `library` 的滚动容器切到了官方 `overlayscrollbars-svelte`。

但这时会出现一个很容易误会的问题：

- “为什么还是能看到 scrollbar？”

查完文档之后，答案很明确：

- `autoHide: 'scroll'` 的定义本来就是“滚动时显示”

也就是说，看到 scrollbar 不一定是接法错了，可能只是：

- 行为参数是对的
- 但视觉权重还太重

所以这一步不是再改 wrapper，而是补一层更克制的 theme。

## 主要目标

- 保留当前 `OverlayScrollbarsComponent` 用法
- 不改变 `autoHide: 'scroll'` 的行为语义
- 通过自定义 theme 压低 scrollbar 的视觉存在感

## 改动概览

- 更新 `src/routes/library/+page.svelte`
  - 给滚动容器增加 `theme: 'os-theme-readest'`
  - 为该 theme 增加更轻的 `--os-size`
  - 收轻 handle 背景颜色
  - 收轻 hover / active 态
  - 对移动端再进一步压小 scrollbar 尺寸

## 关键知识

### 1. `OverlayScrollbars` 里，“行为”和“观感”是两层东西

这是这一步最值得记住的点。

在这个库里，至少有两类配置：

- 行为层
  - 例如 `autoHide: 'scroll'`
- 视觉层
  - 例如 `theme`
  - 以及 `--os-size`、`--os-handle-bg` 这些 CSS custom properties

如果你看到 scrollbar still 太显眼，不一定要立刻改行为。

有时候更正确的修正是：

- 保留行为
- 先压低视觉权重

### 2. “参考另一个产品”时，要先分清它是“参数不同”还是“主题不同”

这次就是一个典型例子。

一开始直觉会觉得：

- `Readest` 看起来没那么明显
- 可能是我们参数不对

但查完以后发现：

- 它的核心 `autoHide` 参数和我们是同一路

那剩下更可能的差异就不在行为，而在：

- 默认主题观感
- 页面背景对比
- scrollbar 的尺寸和透明度

所以对齐时不要只盯 JS 参数，也要盯 theme 和 CSS variables。

### 3. `OverlayScrollbars` 的 CSS variables 很适合做这种“轻微压感”的微调

这一步主要用了：

- `--os-size`
- `--os-padding-*`
- `--os-handle-bg`
- `--os-handle-bg-hover`
- `--os-handle-bg-active`

这类变量很适合做：

- 不改结构
- 不改库行为
- 只改观感强弱

它比重写 scrollbar DOM 或继续打补丁式 CSS 稳得多。

## 验证

- `pnpm check` (PASS)

## 未覆盖项

- 这次没有修改 `autoHide` 行为本身
- 这次没有继续定制 reader 或 sidebar 的 scrollbar theme
- 这次只处理 library 主滚动区的 scrollbar 视觉权重
