# 0072：像 Readest 一样，在 `open()` 后显式进入第一页

这次改动很小，但它针对的是阅读器链路里一个很关键的差异：`Readest` 在 `view.open(bookDoc)` 之后，并不会停在那里，而是还会继续执行一次显式定位。没有这一步，书虽然可能已经被解析、目录也可能已经出来了，但正文未必真的进入稳定的显示状态。

## 这次改了什么

- 在 [`ReaderViewport.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte) 的 `openBook()` 里，`await foliateViewElement.open(source)` 之后，补了一句：

```ts
await foliateViewElement.goToFraction(0);
```

- 然后才把状态切到 `open`，再派发 TOC 和 reader state。

## 为什么这一步重要

`open()` 更像是“把书接进阅读器、准备好内部数据结构”。  
`goToFraction(0)` 更像是“明确告诉阅读器：现在请真正把内容定位到开头并渲染出来”。

在 `Readest` 里，这一步体现在：

- 如果有保存过的阅读位置，就 `view.init({ lastLocation })`
- 如果没有保存过的位置，就 `view.goToFraction(0)`

也就是说，`Readest` 从来不是只 `open()` 就结束。

## 这次能学到的具体知识

### 1. “打开文档” 和 “进入阅读位置” 通常不是一回事

很多阅读器组件、视频播放器、编辑器都有这种两阶段初始化：

- 第一步：把资源加载进来
- 第二步：把视图移动到一个确定位置

如果只做第一步，你会看到一种很迷惑的现象：

- 有些元数据已经存在
- 某些事件也开始触发
- 但主内容区域看起来像没出来

这不是“完全没加载”，而是“还没稳定进入视图”。

### 2. 参考源码时，要抄“动作顺序”，不只是抄“调用了哪些 API”

这次最关键的不是 `goToFraction()` 这个 API 本身，而是它在 `Readest` 里的调用顺序：

1. `open(...)`
2. 配置 renderer
3. `init(lastLocation)` 或 `goToFraction(0)`

如果只抄第 1 步和第 2 步，省掉第 3 步，行为就会不一样。  
做“参考实现”时，经常真正值钱的是这种顺序细节。

## 这次如何验证

我实际运行了：

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
```

结果：

- `PASS`
- `svelte-check found 0 errors and 0 warnings`

## 还没处理的部分

- 这一步只补了 `open() -> goToFraction(0)` 的初始化缺口
- 还没有把完整的“恢复上次阅读位置”做成 `Readest` 那样的 `init({ lastLocation })` 流程
- `pdf` 那条调试链仍然没有纳入这次提交
