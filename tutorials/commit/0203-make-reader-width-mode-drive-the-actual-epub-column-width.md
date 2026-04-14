# 0203 让阅读宽度真正影响 EPUB 正文列宽

## 这次改动想解决什么

之前 `br1` 的“阅读宽度”设置有一个典型问题：

- `ReaderStage` 外层 `canvas` 会跟着 `专注 / 标准 / 宽阔` 变化
- 但 `ReaderViewport` 内部给 `foliate` 的 `max-inline-size` 还是固定算法

结果就是：

- 菜单里看起来有“阅读宽度”设置
- 但正文列宽不一定真的明显变化
- 更像是在改一个外壳，而不是在改阅读本身

这和 Readest 的差距很直接。阅读宽度应该控制的是“正文承载结构”，不是只改外层盒子。

## 做了什么

### 1. `ReaderViewport` 新增 `viewWidthMode` 输入

这次把 `ReaderStage` 里的 `viewWidthMode` 直接传进了 `ReaderViewport`。

这样正文渲染层终于能知道当前选择的是：

- `focus`
- `standard`
- `wide`

而不是只有外层知道。

### 2. `max-inline-size` 现在会随宽度模式变化

在 `ReaderViewport.svelte` 里，`getResponsiveMaxInlineSize()` 不再只看窗口宽高比，而是同时看当前阅读宽度模式：

- `focus`：更窄的正文列宽
- `standard`：保留当前默认值
- `wide`：更宽的正文列宽

这一步才是真正决定“正文一列有多宽”的关键。

### 3. 窗口模式下左右 margin 也随宽度模式变化

除了正文最大宽度，这次还补了 `getResponsiveHorizontalMargin()`：

- `focus`：左右留白更大
- `wide`：左右留白更小
- `standard`：保持中间值

这样“专注”不是只让列变窄，而是整体更有中轴感；“宽阔”也不只是数字更大，而是阅读面更舒展。

### 4. 宽度模式切换后会重新配置 foliate renderer

以前切宽度模式，更多像改 CSS 外壳。

这次新增了一个 reactive block：

- 当 `viewWidthMode` 变化
- 且 `foliateViewElement` 已打开
- 就立即重新调用 `configureFoliatePreview()`

这样宽度模式切换会直接作用到当前正在阅读的书，不用重新开书。

### 5. 新增 focused 桌面回归

自动化现在多了一条明确断言：

- 打开一本文本 EPUB
- 切到 `专注`
- 读取 `paginatorContainer.width`
- 再切到 `宽阔`
- 断言宽阔模式下的可见正文容器明显更宽

这条回归的价值很高，因为它验证的不是“按钮能点”，而是“正文承载结构真的变了”。

## 验证

实际跑过：

```bash
pnpm check
```

结果：`PASS`

```bash
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'keeps the rendered book page inside the reader stage instead of the sidebar column|changes the visible epub reading column width when the view width mode changes' --mochaOpts.timeout 120000"
```

结果：2 条桌面 reader 几何回归都 `PASS`

```bash
git diff --check
```

结果：`PASS`

## 这次顺手能学到的编程知识

### 1. “视觉模式”要尽量打到真正的布局源头

很多 UI 设置表面上像是生效了，其实只是改了外层盒子。

比如这里：

- 如果只改 `.canvas` 宽度
- 但正文引擎自己的 `max-inline-size` 不变

那用户看到的“阅读宽度设置”就是半假的。

真正高价值的改法是：

- 找到内容排版的源头参数
- 让设置直接作用到这个源头

### 2. 自动化要验证“结果变量”，不是“操作变量”

如果只测：

- 菜单能打开
- 单选项能点击

这条测试没有验证产品行为。

更稳的测试是去看：

- `paginatorContainer.width`

也就是阅读器最终呈现出来的几何结果。这种断言更接近用户真实感受到的变化。

## 还没有处理什么

- 这一步没有继续处理 header/sidebar/footer 的空间关系
- 没有继续扩展 notes/search/bookmarks 的布局层
- 也没有开始更细的 Readest 视觉还原
