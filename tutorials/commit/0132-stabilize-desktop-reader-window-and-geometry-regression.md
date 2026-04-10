# 背景

这一刀处理的是桌面 reader 自动化基线，而不是继续盲调视觉。

在真正把 Tauri + WebDriver 跑起来之后，先暴露了两个很具体的问题：

1. `webdriver` feature 根本编不过  
2. reader 新窗口默认开得太窄，导致桌面几何回归里主舞台只有 `758px`，分页 iframe 很容易在这个宽度下表现异常

另外，桌面几何用例本身也有一个探针问题：  
它只看了第一个 iframe 里少数几个块级元素，导致明明正文已经在别的 iframe 或以别的文本节点形式出现，却仍然判成失败。

所以这次做的不是“reader 全修完”，而是：

- 先把桌面自动化基线修到可运行
- 把 reader 新窗口默认尺寸提到更接近真实阅读窗口
- 把几何回归改成真正扫描可见文本节点

# 主要目标

- 修复 `webdriver` feature 的编译阻塞
- 让 reader 新窗口默认尺寸更适合分页阅读
- 让桌面几何回归更接近真实可见正文，而不是误报

# 改动概览

- [`src-tauri/src/lib.rs`](/Users/dev/workspace2/hc_apps/br1/src-tauri/src/lib.rs)
  - 增加 `use tauri::Manager;`
  - 让 `setup()` 里 `add_capability()` 在 `webdriver` feature 下正常编译
- [`src/lib/services/readerWindow.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/services/readerWindow.ts)
  - 把 reader 新窗口默认尺寸从 `980x760` 提高到 `1480x920`
  - 增加 `minWidth: 1200` 和 `minHeight: 760`
  - 这样桌面打开书后，主阅读舞台不会一开始就被压成非常窄的列
- [`e2e/app.e2e.ts`](/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts)
  - 几何回归不再只看单个 iframe 和少量标签
  - 改为遍历所有 iframe，并用 `TreeWalker` 扫描真正可见的文本节点矩形
  - 这样能更接近“用户实际能看到的正文”

# 关键知识

## 1. 自动化基线先要“能跑”，再谈它测得准不准

如果桌面自动化 feature 自己都编不过，那么后面的 reader QA 都没有意义。

这次 `add_capability()` 的问题就是一个典型例子：

- 代码逻辑本身没错
- 但 trait 没 import
- 结果整条桌面自动化链直接断掉

所以桌面测试基线的第一层，不是业务逻辑，而是：

- feature 能编译
- app 能启动
- WebDriver 能连上

## 2. 阅读器窗口默认尺寸本身就是“排版参数”

很多人容易把窗口尺寸当成“只是 UI 外壳”。

但在分页阅读器里，窗口尺寸其实直接参与了排版：

- 主舞台宽度变了
- paginator 的可用列宽和 spread 行为就会跟着变
- 你最后看到的是“内容排在哪”“一页还是双页”“是否溢出”

所以 `980x760` 这种偏小的窗口，不只是“看着小”，而是会直接改变 reader 的实际布局结果。

## 3. 回归测试要找“真实可见正文”，不要只找几个标签

如果自动化只写成：

- 找第一个 iframe
- 再找 `h1, h2, p`

那很容易误报，因为真实 EPUB 里正文可能：

- 在第二个 iframe
- 是更深层的文本节点
- 或者首屏先显示图片、版权页、封面页

所以这次改成：

- 遍历所有 iframe
- 用 `TreeWalker` 扫描文本节点
- 再找真正落在可视区域里的矩形

这比只依赖几个标签更稳，也更接近真实阅读体验。

# 验证

- `pnpm check` (PASS)
- `cargo check --manifest-path src-tauri/Cargo.toml --features webdriver` (PASS)
- `git diff --check` (PASS)
- `bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'keeps the rendered book page inside the reader stage instead of the sidebar column'"` (PASS)

# 未覆盖项

- 这次没有继续处理 reader 其它视觉细节，只修了桌面基线和窗口尺寸
- 这次没有新增 PDF 桌面回归
- 这次也没有证明所有 EPUB 都已经完全对齐 Readest，只是把桌面打开与几何基线先稳定下来
