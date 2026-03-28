# 0042: 先把 reader 的中央舞台压安静

这次没有改 reader 的控制逻辑，也没有继续扩 `foliate` 能力。  
目标只有一个：让中央阅读舞台更像“读书的地方”，而不是“展示引擎状态的地方”。

## 这次做了什么

1. 收掉了最重的状态暴露

在 [`ReaderViewport.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte) 里，之前会直接显示：

- `Foliate Mount Boundary`
- `foliate-view ready`
- `sample opened`
- 各种 adapter / sample 状态字样

这些内容对开发有帮助，但在阅读器里会显得很吵。  
这次改成了更轻的表达：

- 标题改成 `Reading Surface`
- hint 改成一句更产品化的话
- paper header 只保留 `reading preview / ready to open`

也就是说，信息没有完全丢掉，但已经不再像调试面板。

2. 把 sample 按钮压成更轻的辅助动作

`Load sample` 改成了更轻的 `Open sample`，样式也更像边缘辅助按钮，而不是主动作 CTA。

这是一个很典型的阅读器设计原则：

- 主舞台是正文
- 辅助动作不能抢戏

3. 收紧纸面和外层舞台的关系

这次继续压了一轮这些值：

- `engine-host` padding
- `engine-paper` 宽度和内边距
- `engine-paper` 阴影
- `engine-stage` 的背景和边框存在感

这些参数会直接影响“像不像一块真正的阅读表面”。  
它们单独看很小，但组合起来会让页面从“内容卡片”更接近“阅读舞台”。

4. 把空态 copy 改得更安静

之前空态 copy 有明显的“开发解释”味道，比如讲 `view.open()`、下一步接目录和位置恢复。

这次改成更接近产品语言：

- 先强调“阅读舞台要安静”
- 再说明“可以打开样例书或本地文件”

这类 copy 收口很重要。  
因为用户不该在正文区里读到一堆实现说明。

## 你可以学到的具体知识

### 1. 为什么“删状态字样”本身就是一种产品改进

很多开发阶段的信息不是“错”，而是“放错了地方”。

例如：

- adapter ready
- sample opened
- engine boundary

这些信息放在控制台、日志、开发面板里都合理；  
但放在阅读舞台中央，会直接破坏用户对产品成熟度的感知。

所以产品化不是简单“删东西”，而是把信息重新放到合适层级里：

- 真正高频、与阅读相关的信息留在舞台附近
- 技术状态往更边缘的层级挪

### 2. 为什么视觉收口常常先改“间距和阴影”，而不是先改颜色

因为很多页面“不像成品”的根因，不是配色错了，而是：

- spacing 太松或太挤
- card 太厚
- shadow 太重
- 主次关系不对

这次 reader 舞台的变化主要就来自：

- 更窄的 paper
- 更轻的 shadow
- 更薄的状态条
- 更安静的空态 copy

这说明一个常见事实：  
**布局和层级，通常比颜色更先决定“质感”。**

## 实际影响

现在 `reader` 的中央舞台已经比之前安静很多：

- sample 按钮更轻
- 技术状态不再直接跳出来
- 纸面和外层舞台关系更接近阅读器
- 空态文字不再像实现说明

这一步做完后，下一步再去压 sidebar 或 bridge，页面整体会更稳。
