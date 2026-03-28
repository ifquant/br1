# 0056: 像 Readest 一样，从 library 发起系统导入

这次提交修的是一个产品动线错误，不是单点 bug。

之前 `br1` 的导入责任被放在了 `reader` 里，所以结果很奇怪：

- `library` 上放的是假书
- 导入书籍 tile 只是跳去 `/reader?source=picker`
- 用户在书架里点书，感觉像会打开一本真书，实际却只是进入一个空 reader

`Readest` 的做法不是这样。

它的关键点是：

- **library 自己负责发起系统文件选择**
- 文件选完之后，library 负责进入下一步
- reader 接的是一个已经明确好的打开目标

也就是：

`library -> 系统选书 -> 导入/打开 -> reader`

而不是：

`library -> 先跳 reader -> 再想办法导入`

## 这次改了什么

1. 给 reader 增加了一个最小 `asset` 打开通路

在 [types.ts](/Users/dev/workspace2/hc_apps/br1/src/lib/reader/types.ts) 里，`ReaderControlRequest` 现在支持：

- `type: 'asset'`
- `url`
- `label`

在 [ReaderViewport.svelte](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte) 里，这会走统一的：

- `openBook(controlRequest.url, controlRequest.label)`

这样 reader 终于不只会开 sample，也能开一个明确给定的资产源。

2. reader route 可以从 query 里自动打开资产

在 [reader/+page.svelte](/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte) 里，现在支持：

- `source=asset`
- `url=...`
- `label=...`

进入 reader 后，会自动把它翻译成一个 `asset` 控制请求。

这一步很重要，因为 library 和 reader 之间终于有了一条明确的数据桥，而不是只靠“进到 reader 再说”。

3. library 自己发起系统文件选择

在 [library/+page.svelte](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte) 里：

- 新增了隐藏的 `input[type=file]`
- `导入书籍` tile 现在直接触发文件选择
- 选中文件后会创建 `object URL`
- 然后把 reader 打开到：

```text
/reader?source=asset&url=...&label=...
```

这就是这次最接近 `Readest` 的地方：

- 不是 reader 自己决定何时导入
- 是 library 主动发起导入

4. 书架里的样例书也换成了“真能打开的资产”

在 [library/+page.svelte](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte) 里，之前一堆书都只会跳：

- `/reader?source=sample`

现在改成：

- `sample-book.epub`
- `sample-outline.pdf`

也就是说，即使还没接真实 library 数据库，至少这些书架卡片已经不再是纯假的入口了。

## 你可以学到的具体知识

### 1. “从哪里发起动作”也是架构

很多人会把“文件选择器放哪”当成 UI 细节。

其实不是。

如果导入是 library 的职责，那系统文件选择也应该从 library 发起。  
否则你就会得到一种很别扭的产品感：

- 用户明明在书架里
- 却得先跳进 reader
- 再去导入一本书

这个不是按钮位置的问题，是职责分层的问题。

一个很实用的判断标准是：

- 用户心里觉得“我现在在管理书”
- 那动作就应该从 library 发起

### 2. query 参数适合传“可序列化目标”，不适合直接传复杂对象

这次我们在 route 之间传的是：

- `source=asset`
- `url`
- `label`

而不是直接传一个 `File` 对象。

原因很简单：

- `File` 不能安全地放进 URL
- route 之间最稳的是传“可序列化的打开目标”
- 真正的打开动作在 reader 内部统一处理

这类模式在桌面和 web 里都很常见：

1. 上游只负责告诉下游“要打开什么”
2. 下游自己负责“怎么打开”

## 这次怎么验证

我实际跑了：

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
```

结果：

- `pnpm check` 通过

## 还没包括什么

- 这还不是 `Readest` 那种完整 library 导入系统，没有真正的库状态持久化
- object URL 只是当前会话内的最小打开通路，还没做成长期导入记录
- sidebar / header / 独立 reader window 的继续对齐不在这次提交里
