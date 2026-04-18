# 0229: 把 reader 的高亮从“隐式实现细节”拆成真实产品动作

这一刀收的是 `P0-3` 里 annotation surface 的一个真实缺口：之前 `br1` 虽然已经能记笔记，也会在 foliate 里画出一层高亮色块，但“高亮”本身并不是产品动作。用户只能“记一条笔记”，然后顺带得到一个 overlay。  

这会带来两个问题：

1. 产品语义不诚实  
   用户看不到“高亮”和“笔记”的区别，UI 里只有一个入口，列表里也只有“笔记”。

2. 持久化模型不清楚  
   旧的 `ReaderNote` 只有一类记录，导致后面没法做“高亮数量 / 高亮列表 / 高亮颜色”这种更正式的产品层能力。

所以这一刀没有去做更大的 annotation schema，而是先做一个最小、可持久化、可回归的拆分：

- `ReaderNote` 增加 `kind: 'note' | 'highlight'`
- sidebar 在选中文本后同时给出两个动作：
  - `先高亮当前选中内容`
  - `为当前选中内容记笔记`
- note list 里用 badge 明确区分 `高亮` 和 `笔记`
- `highlight` 不再弹 prompt，也不会显示编辑按钮
- legacy note 数据默认按 `kind = 'note'` 迁移

## 关键实现

### 1. 给标注模型加 `kind`

位置：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/types.ts`
- `/Users/dev/workspace2/hc_apps/br1/src-tauri/src/models.rs`

前端的 `ReaderNote` 和 Tauri 侧的 `ReaderNoteRecord` 都加了 `kind`。  
Rust 侧用了 `serde(default)`，这样旧的 notes 文件没有 `kind` 也不会炸，默认直接落回 `note`。

这一步的重点不是“类型更完整”，而是把后续产品能力的分叉点落到持久化层。

### 2. notesController 不再只会“加笔记”

位置：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/notesController.ts`

原来 controller 只有一条路：

- 选中文本
- prompt 输入笔记
- 存一条 note

现在改成：

- `addFromSelection('note')`
- `addFromSelection('highlight')`

并新增：

- `addHighlightFromSelection()`

这样：

- `note` 会继续走 prompt
- `highlight` 直接落盘，不弹输入框

另外这里还顺手加了 `normalizeReaderNotes()`，让旧记录统一补上 `kind = 'note'`。

### 3. sidebar 终于把“高亮”和“笔记”做成两个动作

位置：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte`
- `/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte`

现在 notes workspace 顶部会出现两个动作：

- 一个 secondary action：`先高亮当前选中内容`
- 一个 primary action：`为当前选中内容记笔记`

列表里每条记录也会显示 badge：

- `高亮`
- `笔记`

并且：

- `highlight` 没有编辑按钮
- `note` 仍然保留编辑能力

这一步的价值不只是多了个按钮，而是 annotation surface 的语义终于更接近真正的阅读器工作流。

### 4. viewport 的 overlay 颜色也开始和 `kind` 对齐

位置：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte`

`draw-annotation` 事件现在会根据 `annotation.kind` 决定颜色：

- `highlight` 用更亮、更直接的高亮色
- `note` 继续保留原来较淡的标注色

这让“高亮”和“带笔记的标注”不仅在列表里不同，在正文里也开始表现出不同语义。

## 回归

位置：

- `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`

这次没有只测“按钮能点”，而是把 `TXT` 的 annotation web smoke 扩成了完整链路：

1. 选中一段文本
2. 创建高亮
3. 再选另一段文本
4. 创建笔记
5. 验证 notes meta row 里同时出现 `1 高亮 / 1 笔记`
6. 滚动离开当前定位
7. 点 note list 跳回保存位置
8. reload 后确认两类记录都还在

这样这条能力就不是 UI 幻象，而是：

- 可创建
- 可持久化
- 可 reopen
- 可在列表里区分

## 还没做的事

这一刀故意没把 annotation 一次做重：

- 还没有独立的 highlight workspace
- 还没有 highlight 颜色管理
- 还没有“只高亮不记笔记”的 desktop focused regression
- `CBZ` 仍然是显式不支持正文文本批注的格式
- `TXT` 仍然是粗粒度 `txt:<fraction>` 定位，不是精确 text anchor

也就是说，这一步只是把“高亮”从隐式实现细节提升成了真实产品动作，但还没有把 annotation 系统做完整。
