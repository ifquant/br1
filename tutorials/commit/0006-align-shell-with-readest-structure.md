# 0006 Align the Svelte shell with Readest's page structure

## 背景

`br1` 已经有了最基础的 Svelte 壳，但还没有真正开始对齐 `Readest` 的页面结构。

如果这时就直接迁阅读引擎、TTS 或 store，很容易出现一个问题：

- 功能在涨
- 但挂载边界和页面层级还是临时的
- 后面每迁一点 `Readest` 能力，就要返工一次壳层

所以这一步先做结构对齐，把 `Readest` 的主页面形状翻译成 `Tauri + SvelteKit` 的版本。

## 主要目标

- 让 `br1` 的根入口更像 `Readest`，默认先进入书库
- 让 `library` 页面开始具备 `Readest` 风格的头部工具条和书架区
- 让 `reader` 页面开始具备 `Readest` 风格的左侧导航和中央正文分层
- 同时保留 `br1` 自己的右侧 bridge 挂载位

## 改动概览

- 调整全局壳导航，让主入口围绕 `library` 和 `reader`
- 把根路由改成默认跳转到 `/library`
- 新增 library 结构组件：
  - `LibraryHeader.svelte`
  - `BookshelfPreview.svelte`
- 新增 reader 结构组件：
  - `ReaderSidebar.svelte`
  - `ReaderWorkspace.svelte`
- 重写 `library/+page.svelte` 和 `reader/+page.svelte`，让 route 文件更像组装层而不是巨石页面

## 关键知识

### 1. 迁移一个成熟产品时，先迁“页面分层”，再迁“功能细节”

很多人做迁移时，第一反应是直接搬最显眼的功能，比如：

- 阅读渲染
- TTS
- 目录展开
- 设置面板

但如果页面层级还没定，功能越早搬，返工越多。

这一步的实际价值在于先把这些稳定骨架立住：

- library 是应用默认入口
- reader 是一个独立工作区
- 左侧导航、中央正文、附加控制区各有明确位置

这样后面接 `foliate-js` 或 store 时，新的能力有地方落，不用重新改页面骨架。

### 2. route 文件应该更像 composition layer，而不是“所有东西都写在页面里”

这次专门把 library 和 reader 的结构拆成小组件，不只是为了文件好看。

更重要的是：

- route 文件负责页面级拼装
- 结构组件负责局部 UI 边界
- 以后再接 store / service 时，不会第一时间把所有逻辑压进 `+page.svelte`

这是避免前端项目早期“页面文件巨石化”的一个很实用的方法。  
尤其在从 React 迁到 Svelte 的过程中，这条规则很值钱，因为你很容易下意识把 React 时代的复杂页面重新堆回一个新页面文件里。

### 3. “参考 Readest” 不等于把 Readest 原样复制

这一步虽然在对齐 `Readest`，但故意保留了 `br1` 自己的产品差异：

- `Readest` 风格的左侧目录和正文主舞台被保留
- `br1` 的右侧 bridge 面板挂载位也被保留

这是一种更稳的迁移方法：

- 先借成熟产品的结构稳定性
- 再在新产品真正需要差异化的地方留接口

这样不会一开始就把自己困死在“完全 clone”里。

## 验证

- `pnpm check` (PASS)

## 未覆盖项

- 这次没有接入 `foliate-js`
- 这次没有接入 TTS
- 这次没有迁移 `Readest` 的真实 store 或 service
- 根路由目前是前端跳转到 `/library`，还没有进一步做更深的路由策略收敛
