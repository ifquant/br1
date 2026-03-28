# 0052: 把 reader 中央主舞台结构往 Readest 的 BooksGrid 方向翻译

## 背景

之前 `br1` 的 reader 中央区一直由 `ReaderWorkspace` 直接承包：

- header
- viewport
- footer

这样虽然能跑，但结构上 still 更像“一个页面组件”，不像 `Readest` 那种：

- 外层 `ReaderContent`
- 里面组合 `SideBar + BooksGrid (+ Notebook)`

如果后面还想继续对齐 `Readest`，继续把所有事情都塞在一个 `Workspace` 组件里，只会越来越难拆。

## 这次做了什么

1. 新增 [ReaderStage.svelte](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderStage.svelte)

- 它承接了 reader 中央主舞台
- 语义上更接近 `Readest` 的 `BooksGrid` 主体
- 内部继续组合：
  - 顶部 reader chrome
  - `ReaderViewport`
  - 底部 footer/progress

2. 更新 [index.ts](/Users/dev/workspace2/hc_apps/br1/src/lib/components/index.ts)

- 导出 `ReaderStage`

3. 更新 [reader/+page.svelte](/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte)

- route 现在开始用：
  - `ReaderSidebar`
  - `ReaderStage`

也就是让路由层更像 `Readest ReaderContent` 的组合层，而不是继续直接依赖一个“工作区大组件”。

## 关键知识

### 1. React 到 Svelte 的“对应实现”不等于逐行翻译 JSX

真正该翻译的是**结构职责**，不是语法皮肤。

比如 `Readest` 里的：

- `ReaderContent`
- `BooksGrid`
- `SideBar`

翻成 Svelte 时，重点不是把 `tsx` 改成 `.svelte`，而是保留这套分层关系：

- route / page 负责组合
- stage 负责中央阅读主舞台
- sidebar 负责导航面板

这样后面继续加能力时，结构才会稳。

### 2. 先把“中心舞台”独立出来，后面更容易继续贴近成熟产品

如果 header / viewport / footer 都混在一个泛泛的 `Workspace` 组件里，  
你很难判断它到底是：

- 页面容器
- 业务容器
- 阅读主舞台

而一旦先抽成 `ReaderStage`，后面做这些动作都会更自然：

- 对齐 `Readest` 的 header/footer 行为
- 给中心舞台接更多阅读器能力
- 让 route 只负责 sidebar/stage/panel 组合

## 验证

- `pnpm check`
- `git diff --check`

## 还没做

- 旧的 `ReaderWorkspace.svelte` 还留在仓库里，暂时没有删掉
- `ReaderStage` 现在 still 是基于现有逻辑迁过去的第一步，不是 `Readest BooksGrid` 的完整重建
