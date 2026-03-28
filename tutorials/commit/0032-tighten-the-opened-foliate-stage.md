# 0032: 把打开后的 foliate 阅读舞台压成更像真正阅读器的表面

这一提交不增加新的阅读能力，只处理一个问题：  
样例书虽然已经能打开，但视觉上还像“一个嵌进来的 web component”，不像真正的阅读器主舞台。

所以这一步的目标是把 `foliate-view` 打开后的表面层继续往 `Readest` 靠：

- 宿主层和舞台层分开
- 打开后给 renderer 最小的 paginated 参数
- 用 `::part(head/foot/filter)` 收紧阅读区气质

## 为什么要先做视觉整合

如果在阅读引擎刚能打开内容时就继续接：

- TOC
- 位置恢复
- 翻页控制
- bridge 联动

你会很快得到一个“逻辑越来越多，但主舞台 still 很粗糙”的状态。  
这样后面每次看页面，都很难判断问题是行为层的，还是阅读表面层本身就没搭好。

所以先把“打开后的样子”压顺，是个很值的小步骤。

## 改动概览

- 更新 [`src/lib/components/reader/ReaderViewport.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte)
  - 拆开外层 `hostElement` 和内层 `stageElement`
  - 不再把同一个 DOM 节点同时当宿主和舞台
  - 在样例书打开后，对 `renderer` 设置最小的 paginated 属性：
    - `flow="paginated"`
    - `margin="20"`
    - `gap="6%"`
    - `max-inline-size="720px"`
    - `max-block-size="980px"`
  - 给 `foliate-view` 的 `part(filter/head/foot)` 加了阅读器表面样式

## 这次顺手学到的具体知识

### 1. 宿主容器和内容舞台最好分开，不要一层 DOM 兼两个职责

前一版里，同一个元素既是：

- 自定义元素挂载宿主
- 又是可视阅读舞台

这样短期能跑，但后面很容易出现职责打架：

- 宿主要管生命周期
- 舞台要管尺寸、背景、视觉层次

一旦同一个节点同时承担这两件事，后面加 overlay、selection、scroll surface 时会越来越乱。

所以这次把它拆成：

- `hostElement`：外层 reader 引擎边界
- `stageElement`：真正承接 `foliate-view` 的可视舞台

这种分层对复杂嵌入式 UI 很重要。

### 2. Web Component 暴露 `part(...)` 时，应该优先用 `::part(...)` 做表面层定制

`foliate-view` 的内部 renderer 会导出 `head / foot / filter / container` 这些 part。  
这意味着你不需要也不应该硬钻进内部 DOM 结构去改样式。

正确思路是：

```css
foliate-view::part(head) { ... }
foliate-view::part(foot) { ... }
foliate-view::part(filter) { ... }
```

这样有几个好处：

- 不破坏 web component 边界
- 比直接查内部元素更稳
- 更接近 `foliate-js` 官方推荐的样式入口

对接第三方 web component 时，这是一条很实用的原则。

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

- TOC / 章节跳转
- 位置恢复
- 用户文件导入
- 翻页按钮或快捷键
- `bridge` 和阅读引擎联动

它只处理“样例书已经打开之后，这个阅读舞台看起来更像产品，而不是 demo”。
