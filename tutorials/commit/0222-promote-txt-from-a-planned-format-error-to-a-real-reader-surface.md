# 0222: 把 TXT 从 planned-format 错误推进成真实阅读面

这一步继续沿着 `P0-1` 的 `Multi-Format Support` 主线推进，但这次不再补 `open-with`，而是处理一个更大的真实缺口：

- `TXT` 之前已经在格式总账里被列进 scope
- bundle 也已经声明了 `.txt`
- 但产品层真正的行为仍然只是“planned but not implemented yet”

这会让 `Multi-Format Support` 这条能力看起来像已经把边界想清楚了，实际上却还没给用户一个真正可读的路径。

## 为什么这一步现在更值

前面几刀已经把 `FB2 / MOBI / AZW3 / CBZ` 做到了：

- import
- open
- return
- reopen
- restore

同时还补了：

- `AZW3` 的真实 `KF8` 样本
- 多格式 round-trip 后的人类可读 metadata
- desktop `open with` 的 startup/runtime 双路径

到这个阶段，再继续抠 `MOBI` 样本里不存在的 metadata，收益已经不高了。  
更大的 product gap 反而是：

- `TXT` 还停在“正式降级”而不是“正式支持”

也就是说，这一步的意义不是加一个新格式名，而是把一条已经承诺纳入 scope 的格式，从“错误提示”变成“真的能读”。

## 这次没有去硬套 foliate，而是补了第二种 reader engine

文件：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte`

做法是：

- `foliate` 继续负责 `EPUB / PDF / FB2 / MOBI / AZW3 / CBZ`
- `TXT` 单独走一个最小 plain-text reader surface

这样做的原因很直接：

- 纯文本文件没有 ebook container
- 没有 TOC
- 没有 CFI
- 也没有必要伪装成 EPUB

所以更诚实的产品路径应该是：

- 一个真正可滚动的文本阅读面
- 明确的 `TXT` / `SCROLL` 状态
- 进度和恢复都走 fraction

而不是为了“统一”去塞进错误的内容模型。

## 改了什么

### 1. `TXT` 进入正式支持边界

文件：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/formats.ts`

改动：

- `txt` 从 `PLANNED_READER_FILE_EXTENSIONS` 挪进 `SUPPORTED_READER_FILE_EXTENSIONS`

这意味着：

- desktop import picker 会正式接受 `.txt`
- reader file input 也会接受 `.txt`
- 后续路径不再把它当成“已知未实现”的特例

## 2. `ReaderViewport` 新增 plain-text mode

文件：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte`

新增状态：

- `openEngineMode`
- `plainTextContent`
- `plainTextTitle`
- `plainTextScroller`

新增逻辑：

- `loadPlainTextSource()`
- `getPlainTextReaderState()`
- `emitPlainTextReaderState()`
- `applyPlainTextFraction()`

打开 `.txt` 时：

1. 不再调用 `loadReaderBookDocument()`
2. 直接读入文本内容
3. 把 reader 切到 `plain-text` 模式
4. `layoutLabel` 标成 `SCROLL`
5. 初始恢复走 `fraction` 或 `txt:<fraction>` 形式的 `progressLocation`

### 3. `TXT` 也有进度、位置和恢复

plain-text mode 里：

- `progressFraction` 来自滚动位置
- `progressLabel` 继续用 `%`
- `locationLabel` 改成 `Line X / Y`
- `progressLocation` 存成 `txt:<fraction>`

这一步很重要，因为它决定了：

- library 回写不会退化成“刚刚打开”
- reopen 时能真正恢复到上次位置
- `TXT` 不只是“显示出来了”，而是进入了 reader/library 的同一套状态契约

## 4. footer 控制也真的作用在 TXT 上

这次没有让 `TXT` 变成一个独立小组件，而是让它继续接 reader 的 control path：

- `start`
- `fraction`
- `next`
- `prev`

对应地：

- footer slider 会驱动 `TXT` 的滚动恢复
- `Next page` / `Previous page` 也会推动 plain-text surface 前后滚动

这样 `TXT` 不是一块和 reader chrome 断开的“特殊区域”，而是 reader 自己的一种正式打开模式。

## 5. web smoke 和 desktop regressions 都把 TXT 吃进主矩阵了

文件：

- `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`
- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

### web

以前：

- `/reader?...sample-book.txt` 预期是 planned-format error

现在：

- 预期变成真正打开
- footer 显示 `TXT` 和 `SCROLL`
- 页面存在 `plain text reading surface`

### desktop

`sampleLibraryFormats` 现在把 `TXT` 也纳进去了，所以 focused regression 已经覆盖：

- import TXT
- library-file 打开 TXT
- 通过 reader footer 的真实控制面让 TXT 前进
- 返回 library 后写出 restore 信号
- 重开后消费 restore 进度

这里还顺手把桌面批量回归的两个脆点修了一下：

1. `readReaderDetails()` 现在能在 `TXT` 模式下从 header/footer 读取 title/total/progress，而不是只盯着 `foliate-view`
2. `openReaderFromLibraryPath()` 改成等待 href 真出现，不再只扫一次瞬时 DOM

## 6. 为什么还扩了 TXT 样本

文件：

- `/Users/dev/workspace2/hc_apps/br1/static/samples/sample-book.txt`

一开始虽然 plain-text reader 已经通了，但 desktop restore regression 还是一直是 `0%`。  
根因很简单：

- 样本太短
- 根本滚不动
- 当然也就不可能有 restore progress

所以这次把 fixture 扩成了足够长、但仍然 deterministic 的纯文本样本。  
这不是“为了测试伪造复杂性”，而是为了让 `TXT` 这条产品链真正有可验证的滚动深度。

## 总账怎么变

`FEATURE-PARITY-AUDIT.md` 现在对 `Multi-Format Support` 的说法已经变了：

- `TXT` 不再是 planned-only
- 它已经进入了 web asset + desktop library-file 的 import/open/return/reopen 主证据

这一步不会让 `Multi-Format Support` 直接变成 `Completed`，但它把一条明显的“名义支持、实际没做”缺口实打实关掉了。

## 这一步没有做什么

这次没有做：

- `TXT` 的全文搜索产品化
- `TXT` 的注释/高亮模型
- 字体/版式系统
- 更广泛的多文本 fixture 体系

这一步只做了一件事：

- 把 `TXT` 从一个确定性的 planned-format 错误，推进成 reader 和 library 都能真实消费的最小支持格式
