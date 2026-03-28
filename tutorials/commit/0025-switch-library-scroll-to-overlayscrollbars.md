# 0025 Switch library scroll to OverlayScrollbars

## 背景

前一步只是把 `library` 右侧可见滚动条先隐藏掉了，这能解决表面问题，但还不算真正跟 `Readest` 对齐。

因为 `Readest` 不是简单写几条：

- `scrollbar-width: none`
- `::-webkit-scrollbar { ... }`

而是直接用了 `OverlayScrollbars` 这一套滚动容器方案。

所以这一步的目标不是“继续藏滚动条”，而是把 `br1` 也切到同底层库。

## 主要目标

- 不再依赖手写隐藏滚动条 CSS 作为主方案
- 给 `library-scroll` 接入和 `Readest` 同底层的 `OverlayScrollbars`
- 用一个很薄的 Svelte 边界把第三方 DOM 初始化包起来

## 改动概览

- 安装依赖：
  - `overlayscrollbars`
- 新增 `src/lib/services/overlayScrollbars.ts`
  - 用 Svelte `action` 初始化 `OverlayScrollbars`
  - 目前只传了 `scrollbars: { autoHide: 'scroll' }`
- 更新 `src/routes/+layout.svelte`
  - 全局引入 `overlayscrollbars` 的官方 CSS
- 更新 `src/routes/library/+page.svelte`
  - 给 `library-scroll` 接上 `use:overlayScrollbars`
  - 加上 `data-overlayscrollbars-initialize`
  - 删除上一版手写隐藏滚动条规则

## 关键知识

### 1. “看起来像同一个产品”很多时候不只是样式一致，还包括底层交互方案一致

如果目标是“更像 `Readest`”，有两种接近方式：

- 表面模仿：把系统滚动条藏起来，看上去差不多
- 方案对齐：直接采用同类型的滚动容器方案

第二种更稳。

原因是：

- 不只是外观更接近
- 滚动层结构、可扩展性、后续控制方式也更接近

所以这一步不是再继续堆 CSS，而是直接把 `br1` 切到 `OverlayScrollbars`。

这类判断很重要：

- 如果只是 UI 小差异，CSS 修正 often 足够
- 如果对方用了明确的基础设施方案，继续靠 CSS 模仿 usually 会越来越偏

### 2. 在 Svelte 里，`action` 很适合包一层“第三方库初始化”

`OverlayScrollbars` 这类库的本质是：

- 拿到一个 DOM 节点
- 初始化
- 组件销毁时释放

这非常适合 Svelte 的 `action`。

因为 `action` 天然就是：

- 元素挂载时执行
- 返回 `destroy()` 清理

所以这一步没有把初始化逻辑塞进页面组件里，而是单独写成了：

- `overlayScrollbars.ts`

这样做的好处是：

- 页面更干净
- 第三方 DOM 逻辑有单独边界
- 后面 reader、sidebar 如果也要接这套方案，可以直接复用

### 3. `data-overlayscrollbars-initialize` 这种属性，通常是用来减少初始化瞬间的闪烁感

这次保留了：

- `data-overlayscrollbars-initialize`

它的作用不是让功能“能不能跑”，而是帮助初始化阶段更平顺。

这类 attribute 很常见于第三方 UI 库：

- 不一定是业务必需
- 但能减少“原生态 -> 初始化后样式”之间的视觉闪动

如果目标是接近成熟桌面 app 的细腻感，这种小细节值得一起带上。

## 验证

- `pnpm check` (PASS)

## 未覆盖项

- 这次没有把 reader sidebar 等其它滚动区域一起迁到 `OverlayScrollbars`
- 这次没有进一步定制 overlay scrollbar 的主题
- 这次只把 library 的主滚动区域切到和 `Readest` 同底层的滚动方案
