# 0228: 给 TXT 补一条最小真实笔记工作流

这次没有继续把 `TXT` 留在“显式不支持批注”的状态，而是把它推进到了一个最小但真实的 notes 工作流：

- 可选中文本
- 可记笔记
- 可持久化
- reload 后还能回来
- 点击笔记能大致跳回原来的阅读位置

## 为什么先做这个

上一刀只是把 annotation 的支持边界说清楚：

- `CBZ`：当前不支持正文文本批注
- `TXT`：也先按不支持处理，避免假入口

但 `TXT` 和 `CBZ` 不一样。

`TXT` 现在已经有：

- 真正的 plain-text reader surface
- 滚动进度
- restore fraction

也就是说，它离“最小文本笔记”只差一个合理的 locator 契约，而不是整个功能都不存在。

所以这一步的判断是：

- `CBZ` 继续维持显式不支持
- `TXT` 提升到最小真实能力

## 这次实际做了什么

### 1. 给 TXT 的选区定义了最小 locator

这次没有发明复杂定位系统，而是先用一个可工作的最小契约：

- `txt:<fraction>`

也就是：

- 选中文本时，记录当前 plain-text surface 的滚动 fraction
- note 的 `cfi` 暂时就用这个 `txt:` 前缀的 fraction locator

这不是最终形态，但足够支持：

- 保存笔记
- reload 后显示
- 点击笔记大致跳回原阅读位置

### 2. plain-text surface 现在真的会发出 selection 状态

之前 `TXT` 虽然能阅读，但 notes 侧没有真正的选区输入。

这次在 plain-text surface 上补了最小的选区跟踪：

- 在 `mouseup / keyup` 后读取 `window.getSelection()`
- 确认选区确实发生在 plain-text surface 内
- 生成 `ReaderSelectionState`
- 发到现有 notes controller

这样 `TXT` 终于走上了和其它文本格式一致的“选区 -> notes controller”链路。

### 3. note reopen 真的消费 `txt:` locator

仅仅能保存还不够。

如果点击笔记后不能回到记录位置，那这条链路仍然只是半成品。

这次补的是：

- plain-text 模式下，`href` control request 现在能识别 `txt:<fraction>`
- 点击 TXT note 时，会把它重新解析成 fraction
- 再把 plain-text surface 滚回相应位置

所以这不再只是“能存在一条 note 卡片”，而是最小可回跳的 notes workflow。

### 4. 把支持矩阵收成新的事实

这一步之后，annotation 的格式级契约变成：

- `TXT`：支持最小文本笔记 workflow
- `CBZ`：仍然显式不支持正文文本批注

这比上一刀更接近正式产品系统，而不是只有 UI 边界。

## 为什么不在这一步继续做 highlight

因为 highlight 和 “最小文本笔记” 不是同一个复杂度等级。

当前 `TXT` 最值钱的增量是先把 notes 这条链路走通：

- selection
- persistence
- reopen
- jump back

而 highlight 还会牵扯：

- 单独的 overlay 呈现
- 与 notes/bookmarks 的关系
- 跨格式一致性

这更适合作为下一刀单独推进。

## 结果

`Annotations and Highlighting` 这一行虽然还不能改成 `Completed`，但状态已经更具体了：

- `TXT` 不再只是“明确不支持”
- 而是已经拥有一条真实的文本笔记工作流
- `CBZ` 继续保留显式降级

这意味着 cross-format annotation consistency 已经开始从“边界声明”进入“实际能力补齐”阶段。

## 这一步没有包含

- 没有让 `CBZ` 支持漫画文本批注
- 没有把 `TXT` locator 做成更精细的文本锚点
- 没有开始做 highlight 的正式产品化
