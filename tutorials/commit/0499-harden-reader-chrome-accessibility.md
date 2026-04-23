# 0499: harden reader chrome accessibility

这次把 `br1` 的 reader chrome 做了一轮很窄的无障碍硬化。目标不是改外观，而是把最常见的键盘、屏幕阅读器和减少动画场景补齐，让顶部/底部/侧栏这些控制层更像一个能长期使用的阅读器。

## 背景

这一轮的审计重点很明确：

- 顶部和底部的图标按钮几乎没有显式 `:focus-visible`
- 窗口模式的 header/footer 只做了淡入淡出，没有 `prefers-reduced-motion` 回退
- TTS 状态文字看得见，但对屏幕阅读器不够明确
- 读者辅助覆盖层要继续保持 `aria-hidden` 和 `pointer-events: none`

所以这次只动 reader 相关的 chrome 和路由壳，不碰正文引擎、不重做布局。

## 这次做了什么

- 给 `ReaderHeaderBar` 的主按钮、菜单按钮和朗读状态补了统一的 `:focus-visible` 样式
- 把 TTS 状态文本标成了 live region，让状态变化能被更清楚地播报
- 给 `ReaderFooterBar` 的翻页按钮和进度条补了 focus ring
- 给 `ReaderSidebar` 里的 tab、chip、action、搜索结果、书签和笔记按钮补了统一的键盘焦点样式
- 给 `src/routes/reader/+page.svelte` 里的侧栏宽度拖拽按钮和桥梁面板按钮补了 focus ring
- 给窗口模式的 header/footer 加了 `prefers-reduced-motion: reduce` 回退，去掉淡入淡出的过渡
- 把 `ReaderViewport` 里的打开状态/错误状态改成真正可读的状态内容，不再被父层 `aria-hidden` 挡住
- 把 `P1-2.4` 在清单里标成完成，并同步记录这次硬化的范围

## 为什么这样做

无障碍硬化最容易犯的错，是一口气想补很多“看起来更完整”的东西。那样很容易把 UI 结构搅乱。

这次采用的是更稳的做法：

1. 先把键盘焦点补齐
2. 再把减少动画的偏好补齐
3. 最后把状态播报补齐

这样能保证每一项都可以独立验证，而且不会影响正文阅读本身。

## 关键知识

1. **`role="status"` 和 `aria-live="polite"` 适合状态文字。** 它们的作用不是“把字念出来一次”，而是让内容变化时，辅助技术能感知到新的状态。TTS 这种会频繁变化的小状态条，通常就适合这种做法。
2. **`prefers-reduced-motion` 不是“关掉所有动画”。** 更实用的做法是先去掉会让人感觉页面在滑动的过渡，比如这里的 header/footer 淡入淡出。这样保留功能，但减少视觉移动。

## 验证

- `pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec check`
- `git -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec diff --check`

## 没有包含

- 没有改 reader 的整体视觉风格
- 没有重做侧栏 tab 的键盘箭头导航
- 没有把 focus-aid overlay 改成可交互元素，它仍然是纯视觉层
