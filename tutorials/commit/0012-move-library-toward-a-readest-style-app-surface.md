# 0012 Move the library toward a Readest-style app surface

## 背景

上一刀已经把 `library` 的卡片比例和书架密度拉近到了 `Readest`，但整体页面还是不像同一个产品。

原因不在单张卡片，而在更上层的视觉框架：

- 页面还是“普通内容区”
- header 还是略厚
- 书架没有被包进一个真正的 app surface

这会导致一个很常见的问题：  
即使单个组件越来越像，整页看起来还是不像。

## 主要目标

- 把 `library` 从普通页面内容收紧成更像桌面阅读器的 `app surface`
- 继续压薄 header，让它更接近 `Readest` 的工具条感
- 让书架内容进入一个明确的 scroll container，而不是继续文档流式向下排

## 改动概览

- 重写 `library/+page.svelte` 的 page frame：
  - 增加 `library-page`
  - 增加 `library-surface`
  - 增加 `library-scroll`
- 给 `library` 内容加上单独的 panel surface、边框、内阴影和滚动区
- 继续压缩 `LibraryHeader.svelte`：
  - 更薄的工具条高度
  - 更小的按钮尺寸
  - 更细的搜索条节奏
  - header 底部分隔线

## 关键知识

### 1. 产品“像不像”常常先取决于外层框架，而不是单个组件细节

这是界面对齐里一个很实用的判断：

- 如果你只盯着卡片、按钮、标题在调
- 但页面外层还是不同的布局哲学
- 那最后很容易变成“零件都像，整页不像”

这次处理的就是那个外层框架问题。

`Readest` 的 library 更像：

- 一个桌面应用工作区
- 顶部是稳定工具条
- 内容在一个受控 surface 里滚动

所以如果 `br1` 还是普通页面流，就算卡片做得像，也会一直有“网页感”。

### 2. 视觉对齐时，header 厚度是非常高权重的变量

很多人做对齐时会先去改颜色、阴影、圆角，但忽略一个更有杀伤力的东西：  
**header 的厚度和密度。**

原因很直接：

- header 是首屏最先被感知的区域
- 它决定整页是“工具型产品”还是“内容型网页”
- 只要 header 过厚、过松，整页就会显得不像桌面 app

所以这次继续把：

- 搜索条高度
- 按钮尺寸
- gap
- 分隔线节奏

往更薄、更克制的方向压。

### 3. scroll container 本身也是视觉设计的一部分

很多时候会把滚动区域当成纯技术实现，但在这类 app 里，它其实也是视觉设计：

- 内容是整页滚，还是 panel 内滚
- 滚动区和 header 是不是同一个 surface
- 内边距是不是跟着 surface 一起收敛

这些都会直接影响“像不像一个成熟桌面阅读器”。

所以这次把书架内容放进 `library-scroll`，不是为了炫结构，而是为了让页面更像一个被设计过的工作区。

## 验证

- `pnpm check` (PASS)

## 未覆盖项

- 这次没有继续改书卡细节
- 这次没有接 `Readest` 的真实 scrollbars、group header 或 view mode 逻辑
- reader 页还没有做同等级别的 app surface 对齐
