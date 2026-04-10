# 背景

当前 `reader` 的 footer 有一个明显但很误导的问题：

- 不管打开的是 EPUB 还是 PDF
- footer 第二段都写死显示 `EPUB`

这会直接造成两个用户可见的问题：

- PDF 明明已经打开了，底栏却还在说自己是 EPUB
- 自动化即使验证“窗口打开成功”，也抓不住这类错误元信息

同时，reader 初始态还保留了一组“假样书”文案，没开书前就显示具体书名和作者，也会干扰判断当前状态。

所以这次做一个很小但真实的修正：

- 让 footer 的格式信息来自真实书籍状态
- 把初始 preview 改成中性占位文案

# 主要目标

- 为 `ReaderPreviewState` 增加真实的 `formatLabel`
- 让 `ReaderFooterBar` 不再硬编码 `EPUB`
- 把 `ReaderStage` / `ReaderWorkspace` 的默认 preview 从“假样书”改成中性等待态
- 用现有 PDF 桌面回归锁住这条行为

# 改动概览

- [`src/lib/reader/types.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/reader/types.ts)
  - 为 `ReaderPreviewState` 新增 `formatLabel`

- [`src/lib/components/reader/ReaderViewport.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte)
  - 新增 `currentFormatLabel`
  - 新增 `inferReaderFormatLabel()`
  - 在 `openBook()` 时根据 `File` / 路径 / 书名后缀推断格式
  - `emitReaderState()` 改为把 `formatLabel` 一起发给外层

- [`src/lib/components/reader/ReaderFooterBar.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderFooterBar.svelte)
  - 用 `preview.formatLabel` 替换写死的 `EPUB`

- [`src/lib/components/reader/ReaderStage.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderStage.svelte)
- [`src/lib/components/reader/ReaderWorkspace.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderWorkspace.svelte)
  - 默认 preview 改成中性状态：
    - `Bridge Reader`
    - `Open a book to start reading`
    - `Waiting for book`

- [`e2e/app.e2e.ts`](/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts)
  - 现有 PDF 恢复回归新增断言：footer 必须显示 `PDF`

# 关键知识

## 1. UI 元信息不要硬编码在展示层

像 footer 里的：

- 文件格式
- 阅读位置
- 章节名

这些都不是纯样式文本，而是“状态投影”。

如果把它们硬编码在组件里，短期看起来省事，长期会出现两个问题：

- 不同格式的真实状态显示错误
- 自动化只能测“有没有东西”，测不到“显示的是不是对的”

更稳的做法是：

- 让上游状态对象显式包含这些字段
- 展示层只负责渲染

这次的 `formatLabel` 就是一个典型例子。

## 2. 默认占位文案应该中性，不应该伪装成真实数据

以前 reader 初始态里直接放了一本具体书的标题和作者，这种“假数据占位”在 demo 阶段很常见，但在真实产品里容易制造混乱：

- 用户没开书，却以为系统已经选中了某本书
- 自动化截图和人工排障时也会被误导

中性占位更好：

- 明确告诉你现在还没打开书
- 不会和真实状态混淆

## 3. 自动化最好顺手验证“用户看得到的元信息”

这次没有新写一条测试，而是加强了已有 PDF 回归：

- 不只验证 reader 没报错
- 还验证 footer 真的显示 `PDF`

这很重要，因为用户感知到的问题，很多时候并不是“功能完全坏了”，而是：

- 内容打开了
- 但 UI 还在说错的话

把这类断言加进去，能更早发现体验层回退。

# 验证

- `pnpm check` (PASS)
- `bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'reopens a library-file pdf with restored progress inside the reader stage'"` (PASS)

# 未覆盖项

- 这次没有继续修改 EPUB/PDF 的实际渲染逻辑
- 格式推断目前主要基于 `File.type` 和文件扩展名，不是更深的文档级判定
- footer 里的第三段 `Serif` 仍然是静态文案，还没有接真实阅读样式状态
