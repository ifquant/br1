# 0023 Give library list items their own structure

## 背景

前面已经把 `library` 的 toolbar、bookshelf 节奏和真实封面资产层都补上了。

这时候剩下一个明显的问题：

- `list` 视图 still 太像“横过来的 grid 卡片”

也就是：

- 封面在左边
- 文案在右边
- 但信息区和动作区还没有真正分层

这类界面一眼看上去不会特别错，但会缺少成熟产品里那种“这是列表，不是卡片变形”的感觉。

所以这一步不去重做全部组件，只先给 list 行项独立结构。

## 主要目标

- 让 `list` 项拥有自己的信息层级
- 把动作位从封面 hover 区移到更合理的 trailing 区
- 让 list 看起来像列表，而不是 grid 卡片的横向版本

## 改动概览

- 更新 `src/lib/components/library/BookshelfPreview.svelte`
  - `list` 模式下改成单独的 metadata 结构
  - 把标题、作者、状态说明放进 `list-copy`
  - 把进度和操作位放进 `list-trailing`
  - 隐藏 list 模式里原本贴在封面角落的 hover 动作位

## 关键知识

### 1. 成熟的 list item，通常不是“横过来的 card”，而是“左右分栏的信息行”

很多 UI 在做 list 视图时，会偷懒直接把 card 横过来：

- 左边封面
- 右边一坨文案
- 操作位继续漂在封面上

这样能很快出效果，但结构 often 不够稳。

成熟 list item 更常见的结构是：

- 左边：视觉锚点，比如封面
- 中间：主要信息区
- 右边：次要状态或操作区

这一步把 `list` 项拆成 `list-copy + list-trailing`，本质上就是在建立这个成熟结构。

### 2. “信息区”和“动作区”分开，是列表产品感的重要来源

列表之所以有更强的产品感，一个关键原因是：

- 用户一眼能看出哪里负责阅读信息
- 哪里负责操作

如果动作位一直贴在封面角落，它更像 hover 特效。

而当动作位进入 trailing 区后，它会更像真正的列表操作接口。

这也是为什么很多系统型产品里的 list item 都会有：

- 主信息区
- 辅助状态区
- 右侧操作区

它不只是美观，而是让信息和动作各自有固定位置。

### 3. 小步重构列表时，先重构 DOM 结构，比只改 CSS 更有价值

如果 list 视图看起来不够成熟，只改 padding、gap、font-size 往往不够。

因为问题不只是“长得不对”，而是“结构不对”。

这一步通过模板分支：

- `if viewMode === 'list'`

直接让 list 和 grid 走不同的 metadata 结构。

这类做法的价值在于：

- 先把结构拉开
- 后面再各自微调样式

如果一开始就坚持同一个 DOM 结构兼容所有模式，后面 usually 会越改越拧巴。

## 验证

- `pnpm check` (PASS)

## 未覆盖项

- 这次没有拆出独立的 `ListItem.svelte` 组件
- 这次没有实现 group item 的真实外观
- 这次只让 library 的 list 视图先拥有更独立的行项结构
