# 0350 - 消除移动端 reader 的横向溢出

这次修复处理的是移动端 reader 的横向滚动问题。375px 宽度下，阅读纸面会比屏幕宽出约 30px，用户可以左右拖动页面。

阅读器不应该横向漂移。移动端阅读的基本体验是：正文稳定地占在屏幕里，用户只需要上下滚动。只要页面能左右晃，注意力就会从书里掉出来。

## 改了什么

- `ReaderStage` 的 `.canvas` 加上 `box-sizing: border-box`。
- `ReaderViewport` 的 `.engine-host` 加上 `box-sizing: border-box`。
- `ReaderViewport` 的 `.engine-paper` 加上 `box-sizing: border-box`。
- 保留原有 padding、边框和纸面层级，只修正宽度计算。

## 为什么会溢出

CSS 默认盒模型是 `content-box`。这意味着：

- `width: 100%` 只算内容区。
- padding 和 border 会额外加在 100% 外面。
- 如果一个容器已经占满屏幕，再加左右 padding，就会比屏幕更宽。

这次 reader 的移动端就是这个情况。外层 canvas 和内部纸面都在用 `width: 100%` 加 padding/border，但没有把 padding 算进宽度里，于是最终出现 30px 横向溢出。

`box-sizing: border-box` 的意思是：宽度包含内容、padding 和 border。它更适合这种“容器必须留在屏幕内”的布局。

## 一个小知识点

排查横向溢出时，不要只盯肉眼截图。可以直接在浏览器里比较：

```js
document.documentElement.scrollWidth - document.documentElement.clientWidth
```

如果结果大于 0，就说明页面确实比 viewport 宽。再扫一遍元素的 `getBoundingClientRect()`，找 `right > clientWidth` 的元素，就能定位是哪一层盒子撑出去了。

## 验证

- `pnpm check`
- gstack browse 移动端截图：`finding-003-after-mobile.png`
- gstack browse JS 检查：`overflowX: 0`，offscreen 元素列表为空

## 还没做

- 没有调整 reader 工具栏的触控目标尺寸。
- 没有改变 reader 页面信息架构。
- 没有改 foliate 内容渲染逻辑。
