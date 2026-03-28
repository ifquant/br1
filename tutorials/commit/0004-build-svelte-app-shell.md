# 0004 Build the Svelte app shell before migrating Readest features

## 背景

`br1` 的目标不是做一个普通的 Tauri 壳子，而是把 `Readest` 的阅读器能力逐步迁到 `Tauri + SvelteKit`。

如果一开始就直接往当前单页占位里塞阅读器逻辑、TTS、bridge 或状态管理，后面会很快遇到两个问题：

- 路由和页面挂载点不清楚
- React 时代的产品结构还没映射到 SvelteKit，就开始混业务逻辑

所以这一步先不碰阅读引擎，先把 Svelte 版应用骨架搭正。

## 主要目标

- 把当前单页占位改成真正的应用壳
- 建立 `library` 和 `reader` 路由
- 把后续迁移 `Readest` 能力要用到的目录先留出来
- 保证这一层结构已经能通过 `pnpm check`

## 改动概览

- 重写全局 `+layout.svelte`，加入真正的顶栏、侧栏和主工作区结构
- 把首页变成 Svelte 版入口页，而不是直接承担整个应用内容
- 新增：
  - `src/routes/library/+page.svelte`
  - `src/routes/reader/+page.svelte`
- 新增迁移落位目录：
  - `src/lib/components/`
  - `src/lib/stores/`
  - `src/lib/services/`
  - `src/lib/reader/`

## 关键知识

### 1. 为什么先搭壳，再迁功能

在 SvelteKit 里，页面结构和挂载边界本身就是架构的一部分。

如果壳层不先整理清楚，后面迁 `Readest` 能力时就会一边加功能，一边返工路由和布局。那种返工很伤节奏。

### 2. `+layout.svelte` 和 `+page.svelte` 的职责不同

- `+layout.svelte` 负责全局壳、导航、slot 容器
- `+page.svelte` 负责某个页面自己的内容

这次就是把原来混在首页里的东西拆回正确位置，让 `layout` 管壳，`page` 管页面。

### 3. 目录占位不是空工作

这次新建的 `src/lib/components/`、`stores/`、`services/`、`reader/` 不是形式主义。

它们的作用是：

- 给后续迁移 `Readest` 能力提供明确落点
- 防止后面把所有逻辑继续堆进 route 文件
- 让“先搭正，再接功能”的执行顺序变得可见

### 4. 这是 Svelte 迁移，不是 React 代码直译

这一步的重点不是把 React 组件逐行翻译成 Svelte。

更重要的是先把：

- 信息架构
- 页面分层
- 布局边界
- 后续功能挂载点

这些迁过来。

## 验证

- `pnpm check` (PASS)
  - `svelte-check found 0 errors and 0 warnings`

## 未覆盖项

- 这次没有接入 `foliate-js`
- 这次没有接入 TTS
- 这次没有接入 bridge 和 AI 请求
- 这次没有加入复杂 store 或阅读状态恢复逻辑
