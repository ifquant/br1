# 0034: 不上 store，先给 reader 接最小翻页控制

这一提交的目标很小，但很关键：  
让 `reader` 从“能显示真实状态”再推进一步，变成“能主动驱动引擎”。

这次只接了 3 个最小控制：

- `Prev`
- `Start`
- `Next`

它们分别对应：

- `view.prev()`
- `view.goToFraction(0)`
- `view.next()`

## 为什么先这样做

现在 reader 还在接入早期。

如果这时候就直接上：

- 全局 store
- 完整快捷键系统
- 持久化位置恢复
- 完整 footer 进度条拖拽

会一下把复杂度拉高很多，而且一旦出错，很难分清到底是：

- 命令分发边界有问题
- `foliate-view` 接口有问题
- 还是更上层状态系统有问题

所以这一步故意用一个最小命令对象：

```ts
{ type: 'prev' | 'next' | 'start', nonce: number }
```

从 `ReaderWorkspace` 往下传给 `ReaderViewport`，再由它直接调用底层阅读引擎。

## 改动概览

- 更新 [`src/lib/reader/types.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/reader/types.ts)
  - 给 `ReaderPreviewState` 增加 `progressFraction`
- 更新 [`src/lib/reader/foliate.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/reader/foliate.ts)
  - 给 `FoliateViewElement` 补上：
    - `prev()`
    - `next()`
    - `goToFraction()`
- 更新 [`src/lib/components/reader/ReaderViewport.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte)
  - 接收最小 `controlRequest`
  - 用一个 `handledControlNonce` 防止重复执行同一条命令
  - 根据请求调用 `foliate-view` 的翻页/定位方法
- 更新 [`src/lib/components/reader/ReaderWorkspace.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderWorkspace.svelte)
  - 增加最小 footer controls
  - 派发 `prev / start / next`

## 这次顺手学到的具体知识

### 1. 事件流和命令流要分开

前一提交里，`ReaderViewport -> ReaderWorkspace` 是**状态上行**：

- `readerstate`

这一提交里，`ReaderWorkspace -> ReaderViewport` 是**命令下行**：

- `controlRequest`

这两种流不要混在一起。

如果把“状态”和“命令”都揉成一个对象，后面会很难判断：

- 这是引擎回传的当前状态
- 还是 UI 希望引擎执行的动作

在复杂组件通信里，**状态上行、命令下行** 是个很值得坚持的纪律。

### 2. 用 `nonce` 去重，是早期命令式集成里很实用的小技巧

Svelte 的 prop 更新是响应式的。  
如果你只传：

```ts
{ type: 'next' }
```

那么组件很难知道“这是新的 next 请求”，还是“上一次那个 next 对象还在”。

所以这次给它加了：

```ts
nonce: number
```

每发一次命令就递增。  
然后在 `ReaderViewport` 里记住最近处理过的 `handledControlNonce`。

这样就能避免同一条命令被重复执行。

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

- 完整进度条拖拽
- 键盘翻页
- 位置持久化
- 完整 footer / header 控制栏
- TOC 章节跳转

它只是在现有 reader shell 上，先打通一条最小可用的控制通路。
