# 0204 让顶栏和底栏与正文共用同一条内容框

## 这次改动想解决什么

前一刀已经让 `阅读宽度` 真正影响 EPUB 正文列宽，但还有一个明显残缺：

- 正文会按 `专注 / 标准 / 宽阔` 收放
- 顶栏和底栏却还是各自铺满整条 stage

这样看起来像三套不同的布局系统：

- 正文在中间收紧
- header 还是一整条顶着窗口边缘
- footer 也是另一整条横带

这和 Readest 的感觉不一样。成熟阅读器的 chrome 不是“盖在正文上面的全宽工具条”，而是和正文共享同一条中心内容框，只把交互层轻轻搭在正文外沿。

## 做了什么

### 1. 给 header 加了独立的内容框

`ReaderHeaderBar.svelte` 现在把真正承载内容的部分包进了 `.reader-head-frame`：

- 根节点 `.reader-head` 只负责绝对定位、显隐动画、pointer-events
- `.reader-head-frame` 才负责内容宽度和居中

这样顶栏终于分成了两层：

- 外层：窗口 chrome 壳
- 内层：和正文对齐的阅读内容框

### 2. header 宽度模式跟正文同步

`.reader-head-frame.window-mode` 现在和正文使用同一套宽度档位：

- `focus` -> `920px`
- `standard` -> `1080px`
- `wide` -> `1320px`

也就是说：

- 切到 `专注`，标题和按钮区会一起收紧
- 切到 `宽阔`，顶栏内容框也会一起放宽

阅读宽度不再只是正文设置，而是整个 reader 内容框的设置。

### 3. 给 footer 也加了独立内容框

`ReaderFooterBar.svelte` 做了同样的拆分：

- 根节点 `.footer-bar` 只负责窗口模式下的定位和显隐
- 新的 `.footer-frame` 负责真正的内容宽度、背景和边框

这让底栏的控制、进度条和元信息不再横跨整个窗口，而是和正文一起落在中心内容框里。

### 4. `ReaderStage` 把宽度模式继续传到 footer

之前 `viewWidthMode` 只传给了正文。

这次 `ReaderStage.svelte` 也把它传进 `ReaderFooterBar`，让 footer 和正文、header 一样受同一档宽度控制。

### 5. 回归测试不再只看正文，也开始看 chrome

这次把现有的宽度模式桌面回归扩成了两层验证：

- 先确认 `paginatorContainer.width` 在 `wide` 下明显大于 `focus`
- 再确认 `headerFrame.width` 和 `footerFrame.width` 都和 `.canvas` 宽度保持近似对齐

这样锁住的是一个更真实的产品约束：

- 宽度模式不仅要改变正文
- 还要让顶栏和底栏跟正文站在同一条中轴线上

## 验证

实际跑过：

```bash
pnpm check
```

结果：`PASS`

```bash
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'keeps the rendered book page inside the reader stage instead of the sidebar column|changes the visible epub reading column width when the view width mode changes' --mochaOpts.timeout 120000"
```

结果：2 条桌面几何回归都 `PASS`

```bash
git diff --check
```

结果：`PASS`

## 这次顺手能学到的编程知识

### 1. “全宽定位层”和“内容框”最好分开

像 header/footer 这种悬浮 chrome，经常既需要：

- 绝对定位到窗口边缘
- 又需要内部内容和正文居中对齐

这两件事如果都压在同一个节点上，样式通常会越来越拧巴。

更稳的办法是分两层：

- 外层只管定位和显隐
- 内层只管内容宽度和排版

这是一种很常见也很实用的布局分层技巧。

### 2. 布局设置最好验证“跨组件一致性”

`阅读宽度` 这种设置，如果只测试正文是否变宽，还不够。

因为真实产品感受来自多个区域是否一起变化：

- 正文
- 顶栏
- 底栏

所以测试里要看“它们是不是仍在同一条内容框上”，而不是只看某一个组件自己的宽度值。

## 还没有处理什么

- 这一步还没有继续收 `sidebar` 和正文之间的空间关系
- 还没有处理更细的 header/footer 垂直留白和 Readest 视觉节奏
- 也没有开始 `05-03` 的更完整 reader 布局自动化矩阵
