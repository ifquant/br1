# 0015 Remove shell interference from the library route

## 背景

你前面给的两张图里，最大的差距其实不在书卡，而在页面层级。

`Readest` 的 library 是主界面本身。  
但 `br1` 之前的 library 还包在一层明显的全局品牌头和侧边栏里，所以整体看起来更像：

- 一个网站里的页面
- 而不是阅读器主界面

这会导致一个问题：  
就算我们一直继续调书卡、调按钮，整体 still 很难像 `Readest`。

## 主要目标

- 让 `library` 在视觉上更像应用主舞台
- 先去掉全局壳对 `library` 的干扰
- 同时清掉页面里最像 demo 的说明型 summary strip

## 改动概览

- 更新 `src/routes/+layout.svelte`
  - 在 `library` 路由上隐藏全局品牌头
  - 在 `library` 路由上隐藏左侧 workspace rail
  - 为 `library` 单独收紧 main 区 padding
- 更新 `src/routes/library/+page.svelte`
  - 删除 `5 books / grid view / fixed 28:41 covers` summary strip
  - 去掉 shelf 上的长说明文案
  - 让页面重心更集中在书架本身

## 关键知识

### 1. 页面层级往往比局部样式更先决定“像不像目标产品”

很多人做界面对齐时，第一反应是：

- 调卡片阴影
- 调圆角
- 调按钮颜色

这些不是没用，但如果外层层级还是错的，就会出现一个常见问题：

- 局部越来越像
- 整体还是不像

因为用户先感知到的是：

- 这是不是一个主界面
- 这是不是一块工具工作区
- 这是不是产品主舞台

而不是某个按钮是不是刚好 2px。

### 2. 用“按路由切壳”来做视觉对齐，是一种很实用的过渡方案

这次没有重构整个 app，而是直接在 `+layout.svelte` 里按路由判断：

- `library` 路由隐藏全局品牌头和 side rail
- 其它页面暂时维持原样

这种方式的好处是：

- 改动很小
- 风险低
- 能立刻验证“是不是这层壳在破坏对齐”

也就是说，它不是终局架构，但很适合做对齐实验和渐进式重构。

### 3. 对齐成品界面时，要优先删掉“解释型 UI”

像：

- `5 books`
- `grid view`
- `fixed 28:41 covers`
- 以及一大段 section hint

这种信息在设计阶段有用，但在成品里往往会让界面看起来像 demo。

一个很实用的判断标准是：

- 如果这段文字是在向开发者解释页面
- 而不是在向用户服务
- 那它通常不该待在首屏

## 验证

- `pnpm check` (PASS)

## 未覆盖项

- 这次没有继续改 header 的图标和按钮样式
- 这次没有继续调书卡细节
- 这只是 `Step 1`，不是 library 最终视觉状态
