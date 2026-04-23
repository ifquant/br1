# 0498: add a persisted reader ruler and focus aid overlay

这次把 `br1` 的 reader 从“只有外观设置”推进到“真的有一组轻量阅读辅助功能”。目标很小，但必须是真功能：

- 菜单里能真正切换阅读尺
- 还能切换一个聚焦模式
- 这些偏好会写进现有的 reader settings 存储
- 正文区域会立刻显示对应的视觉效果

## 这次做了什么

这次新增了两个很小的设置字段：

- `readingRulerMode`
- `focusAidMode`

它们和现有的 `flowMode`、`themePreset`、`viewWidthMode` 一样，都会经过：

- 默认值创建
- 旧存储归一化
- `localStorage` 持久化

然后在界面上补了两层东西：

- `ReaderHeaderBar` 的 `⋯` 菜单里新增了“阅读辅助”
- `ReaderViewport` 在 `engine-stage / engine-host` 里渲染一个非交互 overlay

这个 overlay 很保守：

- 中间有一条水平阅读尺
- 上下有很轻的聚焦遮罩
- `focusAidMode` 只控制遮罩强弱和宽度
- 没有做段落检测
- 没有改 foliate 的 DOM

## 为什么这样做

阅读辅助这类功能，很容易一开始就想做成“智能识别段落、自动跟随文本”。那样会很重，也很容易把阅读引擎搅乱。

这次先做最稳的版本：

- 先把用户能开关的状态立住
- 再用纯视觉层把效果画出来
- 不碰底层正文结构

这样有两个好处：

1. 状态可以先稳定保存和恢复
2. 视觉效果不会挡住翻页、选区、滚动或窗口 chrome

## 这次的实现重点

### 1. settings 先变成正式合同

`ReaderSettings` 以前只有字体、布局、氛围这些设置。  
这次把阅读尺和聚焦模式也纳入同一份设置模型里，这样 header、viewport、stage 都看的是同一个状态。

### 2. overlay 放在正确的层级

`ReaderViewport` 已经有 `engine-stage` 这个正文宿主层，所以这次直接把 overlay 放在这里面，而不是额外加一个会抢事件的浮层。

关键点是：

- `pointer-events: none`
- 不拦截 selection
- 不拦截 scroll
- 不影响 window chrome

### 3. 聚焦模式只是视觉模式

这一步提供的是“行聚焦 / 段落聚焦”的视觉差异，但没有做段落定位或智能跟随。

初学者可以记住一个简单原则：

**先做可控的视觉反馈，再做更复杂的内容感知。**

这样更容易验证，也更容易回退。

## 验证

- `pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec check`
- `git -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec diff --check`
- `pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec exec playwright test tests/e2e/library-smoke.spec.ts -g "reader persists epub layout settings through reload in web mode"`

这里有一个很具体的测试细节：菜单视觉上属于“阅读辅助”小节，但可访问的 radio group 是“阅读尺”和“聚焦模式”。测试应该按真正的 `aria-label` 找 group，否则会找不到按钮。

## 没有包含

- 没有做 paragraph detection
- 没有改 foliate 内部渲染逻辑
- 没有加入更复杂的阅读辅助算法
