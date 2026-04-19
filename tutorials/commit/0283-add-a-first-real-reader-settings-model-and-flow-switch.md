# 0283: add a first real reader settings model and flow switch

这一提交开始真正执行 `P0-2 阅读模式与版式系统`，把原来散落在 `ReaderStage` 里的几个局部状态，收成一份正式的 reader settings 模型，并让它真实驱动 foliate renderer 和 plain-text surface。

## 为什么要做

之前 `br1` 的 reader 虽然已经有：

- 宽度模式
- 氛围模式
- chrome 显隐

但它们更像局部菜单项，不是正式的阅读设置系统。

更关键的是：

- `ReaderViewport` 一直强制 `flow='paginated'`
- 审计表里明确把 `Scroll/Page View Modes` 和 `Customize Font and Layout` 标成 `Partial`

所以这一刀的目标不是继续修 open pipeline，而是先把 `P0-2` 的第一块硬缺口补上：

1. 建正式 settings 模型
2. 给出真实的 `scroll / paginated` 用户切换
3. 让字体/字号/行距/边距/主题设置真正作用到正文
4. 让这些设置能在 reload / reopen 后回来

## 做了什么

### 1. 新增正式的 `ReaderSettings` 类型和持久化模块

新增：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/types.ts`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/settings.ts`

把 reader settings 正式定义成：

- `flowMode`
- `fontFamily`
- `fontScale`
- `lineHeight`
- `pageMargins`
- `themePreset`
- `viewWidthMode`
- `chromeMode`

并通过统一的 `br1.reader.settings` storage key 做 load/save，而不是继续在 `ReaderStage` 里分别存三四个零散 key。

这一步很重要，因为它改变的是状态边界：

- 之前：reader 设置是组件局部实现细节
- 现在：reader 设置是正式产品状态

### 2. Header 菜单升级成真正的阅读设置面

`/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderHeaderBar.svelte`

菜单现在不再只有：

- 氛围
- chrome 显隐
- 宽度

而是新增了这些正式分组：

- `阅读模式`
- `字体`
- `字号`
- `行距`
- `页边距`

也就是用户现在可以直接切：

- `分页 / 滚动`
- `衬线 / 无衬线`
- `小 / 中 / 大`
- `紧凑 / 标准 / 舒展`
- `窄 / 中 / 宽`

这一步的意义不是“菜单更大了”，而是：

- `Scroll/Page View Modes` 第一次变成了真实产品动作
- `Customize Font and Layout` 第一次不是空喊“以后做”

### 3. `ReaderViewport` 不再把 renderer 锁死在 `paginated`

`/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte`

以前这里是硬编码：

```ts
renderer.setAttribute('flow', 'paginated');
```

现在改成走 settings：

- `settings.flowMode === 'paginated'` 时走分页
- `settings.flowMode === 'scrolled'` 时走滚动

同时 layout label 也不再只是固定看 format/layout，而是会反映当前 flow：

- `SCROLL`
- `PAGINATED`
- `FIXED`

这意味着 footer 上的 layout label 终于和用户真实操作一致，不再只是内部几何状态的旁观文本。

### 4. 正文字体/字号/行距/边距开始真实驱动 renderer

`/Users/dev/workspace2/hc_apps/br1/src/lib/reader/foliate.ts`

以前 `getReaderViewStyles()` 是死样式：

- 固定 serif
- 固定 `20px`
- 固定 `1.78`
- 固定纸白主题

现在改成 `getReaderViewStyles(settings)`，按 settings 动态生成：

- theme colors
- font family
- font size
- line height

对应地，`ReaderViewport` 还会把 page margins 和 flow 一起传给 renderer。

这一步的本质是：

- 设置不再只是 header menu 的 UI 状态
- 设置开始真实影响正文排版

### 5. plain-text surface 也吃同一套设置

`TXT` 不走 foliate renderer，所以如果只改 EPUB/Foliate，会形成“两套设置系统”。

这次顺手把 plain-text surface 也接进来了：

- `fontFamily`
- `fontScale`
- `lineHeight`
- `pageMargins`
- `viewWidthMode`

这样 `TXT` 不会变成 settings 体系外的例外格式。

## 验证怎么做的

新增了一条 web smoke：

- `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`

它直接验证：

1. 打开 `sample-book.epub`
2. 用 header menu 切到：
   - `滚动`
   - `无衬线`
   - `大`
   - `舒展`
   - `宽`
3. 检查 renderer 真正吃到了：
   - `flow = scrolled`
   - `margin-left = 52px`
   - `fontSize = 22px`
   - 更大的 line-height
   - sans font family
4. `reload` 之后再检查一遍，确认设置没有丢

这里刻意不是只看 footer 或 active button，而是直接读 renderer 和文档 computed style。这样证据更硬。

## 这一步还没做什么

这次只是 `P0-2` 的第一刀，不是整个阅读设置系统的结案：

- 还没有补 desktop-focused 的 reader settings reopen regression
- 还没有把更完整的 typography presets 做深
- 还没有把 sidebar / header / footer 的所有几何语义都统一收进 settings contract
- 也还没有把 `Scroll/Page View Modes` 和 `Customize Font and Layout` 直接提升到 `Completed`

所以审计表这两行现在仍然是 `Partial`，但性质已经变了：

- 之前是“缺正式系统”
- 现在是“系统已经存在，但覆盖和收尾还不够”

## 你可以学到什么

### 1. 产品设置要先变成正式状态模型，再谈 UI

如果只先加菜单，不先定义 settings contract，很容易出现：

- 菜单项越来越多
- 状态越来越散
- reopen 恢复越来越难对齐

这次先抽 `ReaderSettings`，再让 header/viewport 吃这份状态，后面继续扩展就容易很多。

### 2. “设置真的生效” 和 “设置 UI 存在” 是两回事

最容易自欺的是：

- 菜单上有“无衬线”
- 但正文其实还是 serif

所以这次测试不是只看按钮 active，而是直接检查 renderer 的 `flow/margin` 和正文 computed style。

对阅读器这类产品来说，这种验证方式明显比只看 UI label 更靠谱。
