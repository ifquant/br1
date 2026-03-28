# 0035: 给 reader 接一个最小进度条，驱动 `goToFraction(...)`

这一提交的目标是把 `reader` 从“能点上一页/下一页”再推进一步，变成“能通过进度条连续定位”。

这一步仍然很克制：

- 不做位置持久化
- 不做复杂 footer 重构
- 不做完整的 progress bar 系统

只做一件事：  
让 footer 的一个最小 slider 调用 `foliate-view.goToFraction(...)`。

## 为什么先做这个

如果只有 `Prev / Start / Next`，reader 已经有了最小控制，但仍然是离散的。  
要验证 chrome 和引擎之间的导航关系是否顺手，最值得补的一刀就是连续定位。

而 `foliate-view` 本身已经有：

```ts
goToFraction(fraction: number)
```

所以这一步不需要发明自己的定位系统，只要把现有 UI 输入翻译成最小 fraction 命令即可。

## 改动概览

- 更新 [`src/lib/reader/types.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/reader/types.ts)
  - 新增 `ReaderControlRequest`
  - 把控制请求标准化成：
    - `prev`
    - `next`
    - `start`
    - `fraction`
- 更新 [`src/lib/components/reader/ReaderViewport.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte)
  - 让 `controlRequest` 支持 `fraction`
  - 在收到该命令时调用 `goToFraction(controlRequest.fraction)`
- 更新 [`src/lib/components/reader/ReaderWorkspace.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderWorkspace.svelte)
  - 增加最小 slider
  - `readerstate` 回来时同步更新 slider 值
  - `change` 时把当前百分比转成 `fraction`

## 这次顺手学到的具体知识

### 1. UI 滑杆值和引擎导航值最好分开存，再做一次显式转换

slider 天然更适合用 `0..100` 的值。  
阅读引擎导航更适合 `0..1` 的 fraction。

这两个值虽然能互相换算，但最好不要混成一个变量。

所以这次用的是：

- UI 层：`sliderValue`
- 引擎层：`fraction`

然后在边界处做：

```ts
issueFractionControl(sliderValue / 100)
```

这样做更清楚，也更不容易让 UI 和引擎耦死。

### 2. 早期拖动类控件，先用 `change` 提交命令，比每次 `input` 都直推引擎更稳

range input 有两个常见事件：

- `input`
- `change`

如果在 `input` 里每次都直推引擎，那么每拖动一点点就会不断触发一次定位。  
在早期集成阶段，这通常会让行为过于嘈杂，也更难调试。

所以这次的策略是：

- `input` 只更新 UI 上的 `sliderValue`
- `change` 再真正发导航命令

这是一种很实用的“先稳住命令密度，再逐步细化体验”的做法。

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

- 拖动过程中的连续实时定位
- 阅读位置持久化
- 完整 footer 设计
- 多书签/章节跳转
- 键盘快捷键

它只是在当前 reader shell 上，先打通一条最小的连续定位通路。
