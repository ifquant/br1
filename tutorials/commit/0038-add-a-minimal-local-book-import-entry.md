# 0038: 给 reader 加一个最小本地导入入口

这一提交的目标很直接：  
把 reader 从“只能打开样例书”推进到“用户能手动选一本本地书并在当前阅读器里打开”。

这一步仍然非常克制：

- 不做书库入库
- 不做最近阅读记录
- 不做位置持久化
- 不做 library 和 reader 的联动

只做最小导入入口：

- 用户点击 `Open`
- 选一个本地文件
- `ReaderWorkspace` 把 `File` 沿现有控制边界发给 `ReaderViewport`
- `ReaderViewport` 调 `foliateView.open(file)`

## 为什么先在 reader 做，而不是先补 library 导入

如果这一步直接去做完整 `library import`，你会很快掉进更多系统问题：

- 文件落库到哪里
- 元数据怎么抽取
- 封面怎么生成
- library 和 reader 怎么同步

这些都是真问题，但不是这一步最值钱的问题。

现在最该先确认的是：  
**当前这条 Svelte + foliate 的引擎通路，到底能不能稳定接住用户自己的本地文件。**

所以这一步先把问题压成最小：

- 文件选择
- 本地 `File`
- 当前阅读器直接打开

等这条通路稳定了，再决定怎么往 library 方向扩。

## 改动概览

- 更新 [`src/lib/reader/types.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/reader/types.ts)
  - 给 `ReaderControlRequest` 增加 `file` 分支
- 更新 [`src/lib/components/reader/ReaderViewport.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte)
  - 把原先只会打开样例书的逻辑收成 `openBook(source, sourceLabel)`
  - 支持处理 `file` 控制请求
  - 打开后在 header 里显示当前打开源的名字
- 更新 [`src/lib/components/reader/ReaderWorkspace.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderWorkspace.svelte)
  - 增加隐藏的 `input[type=file]`
  - 增加 `Open` 按钮
  - 选择文件后派发 `controlrequest { type: 'file', file }`

## 这次顺手学到的具体知识

### 1. “样例入口”和“真实入口”最好共用同一个打开函数

之前 reader 里已经有：

- `loadSampleBook()`

如果这次又单独写一套“打开用户本地文件”的流程，很容易出现两条越来越分叉的路径。

所以这次把它们统一成：

```ts
openBook(source: string | File, sourceLabel: string)
```

这样样例书和本地文件就只是**不同来源**，不是两套逻辑。  
这是很典型的“先抽统一入口，再往上扩”的做法。

### 2. 文件输入框本身不是 UI，按钮才是 UI

浏览器原生 file input 的视觉通常很难和产品风格统一。  
所以更常见的做法是：

- 隐藏原始 `input[type=file]`
- 用自己的按钮去触发它

这次就是这样做的：

```ts
importInput?.click()
```

这样可以保留浏览器原生文件选择能力，同时不把默认 input 样式硬塞进阅读器工具条里。

## 验证

我实际运行了：

```bash
pnpm check
git diff --check
```

结果：

- `pnpm check`：PASS
- `git diff --check`：PASS

## 还没做的事

这一提交**没有**处理：

- 导入到 library
- 最近阅读记录
- 打开失败时的更细错误提示
- 多文件管理
- 持久化恢复

它只把当前 reader 推进到“可以打开用户本地书文件”的阶段。
