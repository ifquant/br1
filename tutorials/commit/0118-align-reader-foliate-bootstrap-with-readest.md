# 0118: 把 br1 的 reader foliate 启动方式往 Readest 靠一小步

这次切片没有直接去“猜”空白页的最终原因，而是先把 `br1` 最薄弱的一层补齐：`foliate-view` 的初始化协议。之前 `br1` 只是把一个 `foliate-view` 节点塞进页面，然后手写了几条属性；这和 `readest` 的真实做法差距很大。`readest` 会在阅读器创建时统一包装 view、给 renderer 注入阅读样式，并明确设置分页器的 `margin-*`、`gap`、`max-inline-size`、`max-block-size`、`max-column-count` 等约束。

这一刀的目的，是先把“阅读器容器根本没有被正确初始化”这个大类问题排除掉。这样后面如果还有空白、错位、内容挤到角落之类的问题，我们面对的就是更窄、更真实的运行期问题，而不是一个初始化不完整的阅读器。

## 这次改了什么

1. 在 [/Users/dev/workspace2/hc_apps/br1/src/lib/reader/foliate.ts](/Users/dev/workspace2/hc_apps/br1/src/lib/reader/foliate.ts) 增加了 `wrapFoliateViewElement()`。

它参考了 `readest` 的 `wrappedFoliateView` 思路。作用很简单：给 `addAnnotation()` 一个更稳定的入口，把 `cfi` 自动补成 `value`。这样 `notes` 和后面的标注链路，不需要每次都假设调用方已经把 foliate 想要的结构拼好了。

2. 在同一个文件里增加了 `getReaderViewStyles()`。

这是一份“最小可用”的阅读内容样式字符串，专门通过 `renderer.setStyles(...)` 注入到书籍内容文档里。这里先补了几类基础样式：

- 字体族变量和基础字号
- `html/body` 的背景、文本颜色、行高
- 段落缩进和段间距
- 图片、代码块、链接的基础呈现

这一步非常重要，因为 `foliate-view` 的正文通常跑在内部 iframe / renderer 里，外层 Svelte 组件的 CSS 并不会自然落到书籍正文文档中。很多“为什么壳子好好的，正文看起来像坏掉了”的问题，本质上就是内容文档没有拿到正确样式。

3. 在 [/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte) 里，把阅读器初始化改得更像 `readest`。

原来这里做的是：

- 创建 `foliate-view`
- 手工设几个属性
- 打开书

现在变成：

- 创建后先走 `wrapFoliateViewElement(...)`
- 对 `renderer` 调 `setStyles(getReaderViewStyles())`
- 明确设置 `margin-top/right/bottom/left`
- 明确设置 `gap`
- 明确设置 `max-inline-size`
- 明确设置 `max-block-size`
- 明确设置 `max-column-count`

也就是说，开始把“阅读器视图怎么初始化”收敛成一套明确协议，而不是零散试值。

4. 顺手补了窗口模式下几个关键容器的 `min-width: 0`。

这是 CSS Grid/Flex 布局里一个很常见、很隐蔽的问题。很多人看到“内容为什么被挤歪了”，会先怀疑 JS 或组件逻辑；但真实原因经常是子项默认 `min-width: auto`，导致网格项不能按预期收缩。`min-width: 0` 的作用是允许内容区域真正缩进到可用空间里，而不是偷偷把内部布局撑坏。

## 我这次学到的编程知识

### 1. Web Component / iframe 型阅读器，通常需要两层样式

外层页面样式和正文内容样式不是一回事。

- 外层页面样式：你在 Svelte / React 组件里写的 CSS
- 正文内容样式：真正注入到阅读器内部内容文档的 CSS

如果一个组件像 `foliate-view` 这样，内部自己再创建 renderer、iframe、分页器，那么：

- 外层 CSS 只能控制容器盒子
- 内层正文排版，往往要靠 `renderer.setStyles(...)`

这是阅读器、富文本编辑器、图表容器里都很常见的分层。

### 2. `min-width: 0` 是 Grid/Flex 排障的高频工具

很多布局异常不是“宽度没设对”，而是子项默认最小宽度阻止它收缩。

经验上，只要看到这些症状，就应该第一时间检查 `min-width: 0`：

- 某列内容总往外撑
- 内容挤在角落
- 右边大片空白，但左边元素很窄
- `width: 100%` 看起来像没生效

这不是 hack，而是 Grid/Flex 下经常必须显式写出的约束。

## 这次还没做什么

- 还没有证明空白页已经完全修好
- 还没有抓到 `/null` 请求的真实来源
- 还没有做新的运行期桌面回归

所以这次提交是一个“收紧初始化协议”的切片，不是“reader 空白页问题已彻底解决”的切片。后面继续排障时，信息会更干净，结论也会更可信。
