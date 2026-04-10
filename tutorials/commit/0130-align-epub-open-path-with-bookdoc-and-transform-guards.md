# 背景

这一刀处理的是 reader EPUB 排障里的一个基础层问题：  
不要再只把 `File` 直接塞给 `foliate-view`，而是更像 Readest 一样，先拿到 `BookDoc`，再把它交给 viewer。

这样做的原因不是“形式上更像 Readest”，而是为了获得两个更稳定的能力：

1. 在真正开始渲染章节前，就拿到 `book.transformTarget`
2. 给章节资源读取加统一兜底，避免某个样式表、字体或章节资源 Promise 失败后，把整个阅读表面拖进看似空白的状态

这次不是宣称 reader 空白问题已经 100% 终结，而是先把打开链路补到更稳、更接近 Readest 的基线。

# 主要目标

- 把 `EPUB/PDF/...` 的 reader 打开路径从“直接 open(file)”往“先得到 `BookDoc` 再 open(book)`”对齐
- 给 `transformTarget` 的资源读取加统一错误兜底
- 保持当前 reader UI 结构不变，只补打开链路的健壮性

# 改动概览

- [`src/lib/reader/foliate.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/reader/foliate.ts)
  - 新增 `ReaderBookDocument` 类型，明确 br1 内部使用的 book 文档对象边界
  - 新增 `loadReaderBookDocument()`，通过 `foliate-js/view.js` 的 `makeBook()` 先把 `File` 解析成 `BookDoc`
  - 新增 `installReaderBookTransformGuards()`，在 `book.transformTarget` 上统一包一层 Promise 失败兜底，避免资源读取错误直接把章节加载链打断
- [`src/lib/components/reader/ReaderViewport.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte)
  - `openBook()` 现在对 `File` 来源先走 `loadReaderBookDocument()`，再 `view.open(book)`
  - 打开后会再对当前 `view.book` 安装 transform guard，确保通过其它路径得到的 book 也能被兜底
  - 新增 `bindOpenRendererDocs()`，在打开完成后主动给当前已渲染的文档补 selection tracking，而不是只依赖后续事件
- [`src/lib/reader/index.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/reader/index.ts)
  - 导出新的 `ReaderBookDocument`、`loadReaderBookDocument()` 和 `installReaderBookTransformGuards()`

# 关键知识

## 1. “直接打开文件” 和 “先解析成 BookDoc 再打开” 的区别

从表面上看，这两种写法最后都能把书打开：

```ts
await view.open(file)
```

和：

```ts
const book = await makeBook(file)
await view.open(book)
```

但第二种写法有一个很重要的工程优势：

- 你能在 `view.open(book)` 之前就拿到 `book`
- 也就能提前访问 `book.transformTarget`
- 可以在章节资源真正进入 renderer 之前插入拦截、容错和变换逻辑

这也是 Readest 那条打开链路更稳的重要原因之一。

## 2. `transformTarget` 本质上是内容加载总线

很多 EPUB 不是纯文本，它会在打开章节时继续异步拉：

- XHTML
- CSS
- 图片
- 字体

`transformTarget` 就像这些资源进入 renderer 前的一个事件入口。  
如果某个资源 Promise reject，而上层又没有兜底，结果可能不是“明显报错退出”，而是更讨厌的那种：

- TOC 有了
- metadata 有了
- 但正文看起来像没出来

所以这次加的 guard，本质上是在做：

```ts
detail.data = Promise.resolve(detail.data).catch(() => '')
```

也就是把“资源失败”至少降级成“这份资源为空”，而不是把整个章节链路打断。

## 3. UI 问题很多时候要先补“内容链路健壮性”，再补几何

这次排障过程中，一个容易犯的错是只盯着：

- iframe 在哪里
- page rect 对不对
- 文字是不是落在舞台中间

这些当然重要，但如果底层内容链路本身不稳，单调几何很容易进入反复试错。

更稳的顺序通常是：

1. 先保证 book 打开链路健壮
2. 再看 renderer 几何
3. 最后再做 Readest 视觉对齐

# 验证

- `pnpm check` (PASS)
- `git diff --check` (PASS)
- 手工浏览器脚本打开真实 EPUB `股票魔法.epub` 与 `从零开始做餐饮·开店篇.epub`，均能读到 title、iframe 和正文文本 (PASS)

# 未覆盖项

- 这次没有直接跑完整 Tauri 桌面自动化流程
- 这次没有宣称所有 reader 空白/错位问题都已经解决，只是先把打开链路补稳
- 这次没有继续处理 PDF 专线
