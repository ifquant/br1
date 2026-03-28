# 0024 Hide library scrollbars without losing scroll

## 背景

`library` 前面已经把不少视觉层都对齐了一轮，但还有一个很容易一眼看出来的小差异：

- `Readest` 的书架区右侧默认不露系统滚动条
- `br1` 还会把浏览器默认滚动条直接露出来

这类问题不大，但很伤“桌面阅读器感”。

因为一旦系统滚动条直接挂在右侧，页面会更像普通网页容器，而不是经过处理的 app surface。

所以这一步只做一个小修正：

- 保留滚动
- 隐藏可见滚动条

## 主要目标

- 不改变 `library-scroll` 的滚动能力
- 去掉右侧外露的默认滚动条
- 让 `library` 更接近 `Readest` 那种被处理过的滚动表面

## 改动概览

- 更新 `src/routes/library/+page.svelte`
  - 给 `.library-scroll` 增加 `scrollbar-width: none`
  - 给 `.library-scroll` 增加 `-ms-overflow-style: none`
  - 给 WebKit 浏览器增加 `::-webkit-scrollbar { width: 0; height: 0; }`
  - 顺手加了 `overscroll-behavior: contain`

## 关键知识

### 1. 隐藏滚动条，不等于禁用滚动

很多人第一次做这类效果时，会误把：

- “看不到滚动条”

等同于：

- “不能滚动了”

其实不是一回事。

只要：

- `overflow: auto` 还在
- 内容尺寸仍然超过容器

用户仍然可以：

- 鼠标滚轮滚动
- 触控板滚动
- 键盘滚动

隐藏的只是“可见的滚动条轨道”，不是滚动行为本身。

这也是为什么桌面 app 或阅读器里经常会这样处理：

- 保留滚动
- 弱化或隐藏系统滚动条

### 2. 跨浏览器隐藏滚动条，通常要写两套规则

这一步没有只写一条 CSS，因为不同浏览器支持的属性不一样：

- Firefox 常用 `scrollbar-width: none`
- WebKit 系列常用 `::-webkit-scrollbar`
- 旧式 Edge / IE 系列会用 `-ms-overflow-style`

所以如果只写其中一条，效果 often 不稳定。

一个常见的兼容组合就是：

- `scrollbar-width: none`
- `-ms-overflow-style: none`
- `::-webkit-scrollbar { width: 0; height: 0; }`

这类写法不复杂，但很常用，适合记住。

### 3. `overscroll-behavior: contain` 是一个很实用的小配套

这次顺手加上的 `overscroll-behavior: contain`，不是为了隐藏滚动条，而是为了让这个滚动区更像独立表面。

它的作用是：

- 当内部滚动到边界时
- 减少滚动事件继续“传出去”带来的连带滚动感

对这种 bookshelf 容器来说，这是一个很好的小配套。

它不会改变主结构，但会让滚动区域更像一个被控制好的 app 内部面板。

## 验证

- `pnpm check` (PASS)

## 未覆盖项

- 这次没有引入 `Readest` 使用的 overlay scrollbars 方案
- 这次没有修改 reader 页面滚动行为
- 这次只处理 library 页右侧可见滚动条的视觉问题
