# 0053: 把 ReaderStage 再拆成 HeaderBar 和 FooterBar

## 背景

虽然前一步已经把中央主舞台抽成了 `ReaderStage`，但它内部仍然自己包办：

- 顶部 bar
- 中间 viewport
- 底部 footer

这和 `Readest` 的结构 still 不够像。  
在 `Readest` 里，`BooksGrid` 组合的是：

- `HeaderBar`
- `FoliateViewer`
- `FooterBar`

也就是说，中央主舞台本身还是一个**组合层**，不是把所有条带都写在一个组件里。

## 这次做了什么

1. 新增 [ReaderHeaderBar.svelte](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderHeaderBar.svelte)

- 承接顶部 reader bar
- 负责显示书名、作者、章节
- 负责顶部工具按钮
- 保留 `window-mode` 下的拖拽区域逻辑

2. 新增 [ReaderFooterBar.svelte](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderFooterBar.svelte)

- 承接底部翻页和进度条
- 自己向外派发 `controlrequest`

3. 更新 [ReaderStage.svelte](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderStage.svelte)

- 改成更像组合层
- 自己只负责：
  - 文件导入入口状态
  - reader state 汇总
  - 连接 header / viewport / footer

4. 更新 [components/index.ts](/Users/dev/workspace2/hc_apps/br1/src/lib/components/index.ts)

- 导出 `ReaderHeaderBar`
- 导出 `ReaderFooterBar`

## 关键知识

### 1. “继续拆组件”不是形式主义，而是在恢复结构职责

如果一个组件同时负责：

- 展示数据
- 派发控制命令
- 决定布局层级
- 管理拖拽语义

它很快就会再次长成巨石。  
这次拆 `HeaderBar / FooterBar`，不是为了“组件越多越好”，而是为了让每层职责更像 `Readest` 本来的结构。

### 2. 组合层要尽量保留“接线”职责，而不是视觉细节职责

`ReaderStage` 更适合做的事是：

- 收到 `readerstate`
- 把它传给 `HeaderBar`
- 把 `controlrequest` 再往上抛

而不是既画 header、又画 footer、又画 viewport。  
当组合层只做接线，后面你想继续贴近 `Readest` 的时候，就更容易局部替换和局部重构。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做

- `HeaderBar / FooterBar` 现在只是结构职责对齐，还没有完全实现 `Readest` 的 hover/显隐行为
- `ReaderWorkspace.svelte` 还留在仓库里，尚未清理
