# 0026 Align library scroll with the Svelte wrapper

## 背景

上一版已经把 `library` 的滚动容器切到了 `OverlayScrollbars` 这个底层库。

但你指出的问题是对的：

- `Readest` 用的不是“手写初始化 + 库”
- 而是 `overlayscrollbars-react`
- 我们既然是 `Svelte`，就不应该继续手搓一层和 React wrapper 不同的行为边界

所以这一步不是继续调参数，而是把接法也纠正过来：

- 从手写 `action`
- 切到官方 `overlayscrollbars-svelte`

## 主要目标

- 让 `br1` 的 library scroll 行为边界更接近 `Readest`
- 不再使用手写 DOM 初始化作为主要方案
- 改用官方 `Svelte` 封装组件承接滚动容器

## 改动概览

- 安装依赖：
  - `overlayscrollbars-svelte`
- 删除：
  - `src/lib/services/overlayScrollbars.ts`
- 更新 `src/routes/library/+page.svelte`
  - 用 `OverlayScrollbarsComponent` 包住 `library` 的滚动内容
  - 保留 `defer`
  - 保留 `options={{ scrollbars: { autoHide: 'scroll' } }}`
  - 把样式选择器改成 `:global(.library-scroll)`，避免第三方组件 class 带来的 Svelte unused selector warning

## 关键知识

### 1. “同一个底层库”不等于“同一个行为边界”

这是这一步最重要的点。

如果两个项目都用了同一个底层库，但其中一个：

- 用官方 React wrapper

另一个：

- 自己手写初始化逻辑

那它们仍然不算完全同一路子。

因为 wrapper 还负责很多东西：

- 生命周期边界
- slot / children 的挂载方式
- 初始化时机
- 销毁时机

所以如果目标是“行为和 `overlayscrollbars-react` 对齐”，光做到“底层库一样”还不够，最好连封装层思路也对齐。

这就是为什么这一步要从手写 `action` 切到官方 `overlayscrollbars-svelte`。

### 2. 在 Svelte 里，第三方组件上的 class 有时需要配合 `:global(...)`

这一步里最容易让人困惑的是这个 warning：

- `Unused CSS selector ".library-scroll"`

原因不是 class 没生效，而是：

- `library-scroll` 挂在了第三方 Svelte 组件上
- 编译器不能像看原生 `<div class="...">` 那样静态确认它一定命中

所以当你明确知道这个 class 会落到真实 DOM 上时，可以用：

- `:global(.library-scroll)`

来告诉编译器：

- 这是个全局 class 选择器
- 不要按本地模板静态分析去判它“没用”

这类 warning 很常见于：

- 第三方组件
- 动态插入 DOM
- 外部库生成的结构

### 3. 小步重构时，删掉临时层也很重要

这一步除了接入官方 wrapper，还做了一件很值的小事：

- 删除了临时 `overlayScrollbars.ts`

这很重要，因为如果不删：

- 代码库里就会同时存在
  - 手写方案
  - 官方方案

哪怕功能已经切过去了，仓库也会开始积累“看起来还能用”的旧实现。

一个很实用的习惯是：

- 当新的实现已经稳定替代旧实现
- 就尽快把临时层删掉

这样后面的学习、维护、排错都会更清晰。

## 验证

- `pnpm check` (PASS)

## 未覆盖项

- 这次没有继续定制 overlay scrollbar 主题样式
- 这次只把 library 的主滚动区域切到官方 Svelte wrapper
- reader 和其它侧栏滚动区还没有一起迁移
