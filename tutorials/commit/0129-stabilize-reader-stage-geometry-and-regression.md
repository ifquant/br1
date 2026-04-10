# 背景

这次提交不是做新功能，而是把当前 reader 排障线先落地成一次可读的提交。

前面已经确认过一个真实问题：打开书之后，正文有时会被挤到左下角，或者虽然加载了内容，但主阅读区仍然看起来像空白。这个问题如果只靠肉眼调样式，很容易反复来回。所以这次做两件事：

1. 让 `ReaderViewport` 对舞台尺寸变化更敏感，主动重算 foliate 预览参数  
2. 把桌面端回归测试从“窗口开了就算通过”升级成“首段可见正文必须真的落在 reader stage 里”

另外，这次也把当前关于 AI 阅读器定位的设计笔记一并入库，避免只停留在聊天记录里。

# 主要目标

- 修正 reader 在不同窗口尺寸下的预览几何表现
- 提高桌面端 e2e 回归对“正文真的显示在正确区域”的约束
- 把当前产品思考沉淀为仓库内文档

# 改动概览

- [`src/lib/components/reader/ReaderViewport.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte)
  - 新增基于 `stageElement` 的尺寸读取
  - 新增 `ResizeObserver`，在 reader 舞台尺寸变化时重新配置 foliate preview
  - `configureFoliatePreview()` 不再写死预览参数，而是根据当前舞台宽度推导 `max-inline-size` 和 `max-column-count`
- [`e2e/app.e2e.ts`](/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts)
  - 复用 `openUsableReaderBook()`，统一桌面端打开可读书籍的入口
  - 几何回归检查不再只看 reader window 有没有出现，而是进入 iframe，读取首个可见文本块的位置
  - 断言正文块必须落在 `reader-stage` 内，而不是被挤到 sidebar 区或左下角
- [`docs/main1.md`](/Users/dev/workspace2/hc_apps/br1/docs/main1.md)
  - 收录一份关于“AI 阅读器应做知识输入桥接器，而非总结代写器”的产品思考笔记

# 关键知识

## 1. 视觉空白不一定是“没加载”，也可能是“加载到了错误区域”

reader 里最麻烦的一类问题，是数据层看起来都对：

- 目录有了
- 章节有了
- iframe 里甚至真的有 DOM

但用户看到的主阅读区还是像空白。

这时不要只盯着“内容有没有加载成功”，还要盯着：

- 内容被布局到了哪里
- 内容的第一块可见文本是否落在正确的阅读舞台里

所以这次回归测试改成直接量测“首个可见文本块”的坐标，而不是只测窗口和容器存在。

## 2. 第三方阅读引擎的布局参数，最好跟容器尺寸联动

如果一个阅读引擎内部有自己的 column / inline-size 逻辑，而外层应用窗口又会动态变化，那么外层不能只在初始化时配一次。

否则就会出现：

- 初始尺寸还算正常
- 窗口变化后，内部预览仍沿用旧参数
- 最后内容被压缩、溢出，或落到错误区域

这次加 `ResizeObserver` 的核心思路就是：

不要把 preview 配置当成一次性初始化，而要把它当成“依赖 stage 尺寸的派生状态”。

## 3. 自动化测试要测“用户看到的几何结果”，不是只测技术状态

很多 UI bug 都能在技术层“假通过”：

- iframe 存在
- 页面 load 事件触发
- DOM 里有文本

但用户仍然看不到正文。

更强的桌面回归思路是：

- 找到用户实际会看的那块内容
- 读取它在窗口中的真实矩形
- 用这个矩形去验证它是不是在正确的区域

这类测试虽然写起来更麻烦，但更接近真实体验。

# 验证

- `pnpm check` (PASS)
- `git diff --check` (PASS)

# 未覆盖项

- 这次没有实际跑完整桌面端 e2e，只加强了回归断言
- 这次没有继续处理 reader 里其他潜在的渲染空白根因
- `docs/main1.md` 当前仍是原始思考记录，还没有整理成正式产品文档结构
