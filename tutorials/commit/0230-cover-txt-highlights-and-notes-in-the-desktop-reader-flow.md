# 0230: 给 TXT 的高亮/笔记拆分补上桌面回归证据

上一刀已经把 annotation 从“只有笔记”拆成了：

- `高亮`
- `笔记`

但证据面还不够完整，因为当时只有 web smoke。  
这会留下一个明显风险：

- web 模式能创建
- desktop reader 真实工作流未必能创建、持久化、重开

对于 `br1` 当前这条 `P0-3` 主线，这种能力如果只在 web smoke 里成立，还不能算真正收口。  
因为桌面端才是当前 Reader 的主战场，host-side store 也是桌面工作流里的真实持久化层。

所以这一刀没有再改产品逻辑，而是补一条 focused desktop regression，把刚刚拆开的 `TXT highlight + note` 真实走一遍：

1. 导入 `TXT` 样本
2. 从 library 走 `library-file -> reader`
3. 创建一条 `高亮`
4. 创建一条 `笔记`
5. 关闭 reader
6. 重开 reader
7. 确认两类记录都还在

## 新增的 e2e helper

位置：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

加了一个很小的 helper：

- `selectPlainTextInReader(needle: string)`

它不做产品逻辑，只是让 webdriver 能在 `TXT` 的 `<pre>` 文本里稳定选中一段已知内容。  
这比在测试里一遍遍重复 `Range + Selection` 代码更干净，也更适合后面继续扩 TXT annotation 测试。

## 新的 focused regression

位置：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

新增用例大意是：

- 用 `importDesktopSampleLibraryBooks()` 导入 `sample-book.txt`
- 通过 `openReaderFromLibraryPath()` 走真实桌面打开路径
- 清空已有 reader notes，避免旧状态污染
- 选中第一段文本，点击 `secondary-note-action` 创建一条 `高亮`
- 滚到另一段文本，选中后点击 `primary-note-action` 创建一条带正文的 `笔记`
- 检查 notes 面板里出现：
  - `1 高亮`
  - `1 笔记`
- 关闭 reader，再从 library 重开
- 再次检查这两类记录都还在

这里特意没有只断言“卡片数量是 2”，而是继续断言：

- meta row 的计数
- 高亮卡片文本
- 笔记正文文本

这样回归信号更接近真正的产品行为，而不是 DOM 恰好长得差不多。

## 为什么只补 TXT

这一步只补 `TXT`，不是因为别的格式不重要，而是因为：

- `TXT` 是当前最小、最稳定、最可控的 annotation surface
- 它没有 EPUB 那种章节/CFI/渲染差异
- 很适合先把 “highlight 与 note 的拆分” 这件事本身收实

如果直接在这一刀里把 EPUB/FB2/MOBI/AZW3 也一起做，会把问题混成两类：

1. annotation product surface 是否成立
2. 不同格式的定位/恢复/overlay 是否一致

这两类问题应该拆开。

## 对总账的意义

更新后，`FEATURE-PARITY-AUDIT.md` 里 `Annotations and Highlighting` 这一行不再只能写：

- “TXT 在 web smoke 里支持 highlight + note”

而是可以更准确地写成：

- `TXT` 的 `highlight + note` 拆分现在有 web + desktop 双证据

这仍然只够 `Partial`，因为：

- 没有独立 highlight workspace
- 没有 cross-format annotation parity
- `CBZ` 仍然不支持正文文本批注
- `TXT` 仍然是粗粒度 `txt:<fraction>` locator

但至少它已经不是“只在浏览器 smoke 里成立”的能力了。

## 这一刀没做的事

- 没有改 annotation 数据模型
- 没有改 reader runtime 行为
- 没有加 EPUB/FB2/MOBI/AZW3 的 highlight focused regression
- 没有补 desktop 下的 highlight 编辑/删除专门行为

也就是说，这一步是 **补证据面**，不是继续改产品实现。
