# 0058: 让 reader 打不开书时显示真实失败，而不是空白舞台

这次改动不是为了“让界面更漂亮”，而是为了把调试信息从隐形变成可见。

之前 `library -> reader` 的链路里，如果一本书没有真正被 `foliate-view` 打开，用户看到的只是一个空白阅读窗。这种状态最糟糕，因为你不知道问题是在：

- `library` 没把正确参数传进来
- `reader` 没处理对应的控制请求
- 还是 `foliate-view.open(...)` 本身失败了

这次改动的目标，就是把“空白”变成“有来源的失败提示”。

## 这次做了什么

在 [ReaderViewport.svelte](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte) 里补了两样东西：

1. 记录失败来源

- 新增 `openFailureSource`
- 新增 `openFailureMessage`

这样当 reader 失败时，我们不只知道“失败了”，还知道是：

- `sample`
- `asset`
- `library-file`
- 或者其它 `controlRequest`

哪一条链路炸了。

2. 在阅读舞台中央显示失败提示

以前 `sampleStatus === 'error'` 时，用户只能看到空白。

现在会在主舞台中央显示：

- `Failed to open ...`
- 如果有真实错误消息，也会显示出来

这样下一轮手测时，我们能直接看见：

- 是不是 `loadLibraryBookFile()` 就失败了
- 还是 `foliateViewElement.open(...)` 失败了

## 为什么这一步值得先做

因为当前问题不是“按钮长得不像 Readest”，而是：

- 新窗口能打开
- 但正文没有真正加载出来

在这种阶段，最值钱的不是继续磨 CSS，而是让失败路径有可见信号。否则每一轮都只能对着空白窗体猜。

## 这次对应的知识点

### 1. 不要让错误只留在 `console.error`

`console.error` 对开发者有用，但对“正在手点流程”的人没用。

当一个功能链条有多段异步步骤时，最低限度要把这两类信息暴露到界面上：

- **失败发生在哪一段**
- **失败消息是什么**

这样你才能快速判断该查：

- 路由参数
- 文件读取
- 还是引擎加载

### 2. UI 状态不只是 `loading / success`

很多初学者会只写：

- `idle`
- `loading`
- `success`

但实际调试复杂链路时，通常还要补：

- `error`
- `error source`
- `error message`

因为“失败”本身不是一个足够可行动的状态。

## 这次没有做什么

- 还没有修复 `library-file` 打不开的根因
- 还没有把失败信息同步到更高层的 `reader chrome`
- 这一步只负责让失败显式可见，方便下一轮继续定位
