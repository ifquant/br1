# 背景

上一刀已经把 reader footer 里的格式标签从写死的 `EPUB` 改成了真实书籍格式，但 footer 第三段仍然还是一个写死值：

- `Serif`

这个值的问题和前一刀类似：

- 它不是当前 reader 里真正可变的状态
- 也不是用户现在最关心的真实阅读模式
- 对 PDF 来说尤其误导，因为 PDF 更重要的是“固定版式”，而不是“用了什么字体族”

当前项目里还没有一整套可切换的排版设置状态，因此这一步不去假装实现“真实字体主题”，而是先把 footer 第三段换成当前**确实存在且能稳定判断**的布局模式。

# 主要目标

- 为 `ReaderPreviewState` 增加真实的 `layoutLabel`
- 用当前已知的书籍/阅读器状态推断：
  - `PDF` 或 `pre-paginated` => `FIXED`
  - 其他当前分页阅读流 => `PAGINATED`
- 让 footer 第三段不再显示假文案 `Serif`

# 改动概览

- [`src/lib/reader/types.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/reader/types.ts)
  - 为 `ReaderPreviewState` 新增 `layoutLabel`

- [`src/lib/components/reader/ReaderViewport.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte)
  - 新增 `currentLayoutLabel`
  - 新增 `inferReaderLayoutLabel()`
  - 在 `openBook()` 成功后，根据：
    - `formatLabel`
    - `book.rendition.layout`
    推断当前布局标签
  - `emitReaderState()` 现在会把 `layoutLabel` 一起发出

- [`src/lib/components/reader/ReaderFooterBar.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderFooterBar.svelte)
  - footer 第三段由固定 `Serif` 改成 `preview.layoutLabel`

- [`src/lib/components/reader/ReaderStage.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderStage.svelte)
- [`src/lib/components/reader/ReaderWorkspace.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderWorkspace.svelte)
  - 默认 preview 追加中性的 `layoutLabel: 'WAITING'`

# 关键知识

## 1. 没有真实状态时，不要伪造“高级配置”

很多时候最危险的不是“暂时没有功能”，而是：

- UI 先写了一个看起来很合理的标签
- 但背后其实没有真实状态支撑

这会导致：

- 用户误解产品能力
- 你自己后面调试时也容易被 UI 欺骗

这次就是个典型例子：  
当前代码里并没有完整的“字体主题切换状态”，所以继续显示 `Serif` 没意义。更稳的做法是先显示一个当前系统**真的知道**的状态：布局模式。

## 2. 状态推断要优先选择“稳定、低争议”的规则

这次的规则刻意很保守：

- `PDF` => `FIXED`
- `pre-paginated` => `FIXED`
- 其他 => `PAGINATED`

它不追求一步到位，而是优先保证：

- 规则简单
- 结果稳定
- 与当前 reader 实现一致

这类小规则非常适合早期产品，因为它们能先把 UI 里的明显假信息清掉。

## 3. `preview` 对象应该持续变得更像“展示层单一事实来源”

这两刀一起说明了一件事：

- footer/header 这类展示组件不应该自己猜太多
- 更好的方式是把要显示的元信息都收敛到 `ReaderPreviewState`

这样有两个好处：

- 展示组件会更薄
- 后面你如果继续补真实阅读状态，只需要扩展 preview 的来源，而不是到处塞条件分支

# 验证

- `pnpm check` (PASS)
- `bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'reopens a library-file pdf with restored progress inside the reader stage'"` (PASS)
- `git diff --check` (PASS)

# 未覆盖项

- 这次没有实现真实的字体主题/排版配置系统
- `layoutLabel` 目前是保守推断，不是完整阅读设置面板的镜像
- 这次没有扩展新的桌面回归断言，只确认已有 PDF 回归没有被这次 UI 改动破坏
