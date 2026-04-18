# 0232: 给 MOBI / AZW3 补上 desktop annotation split 证据

上一刀已经把 desktop annotation 这条线从：

- `TXT`
- `EPUB`

收成了：

- 真正的 `高亮 / 笔记` 分离
- host-side notes store 可持久化
- 重开后仍然存在

但这还不够。因为 `br1` 的 secondary text formats 里，还有一组最接近 `EPUB` 主路径的 Kindle-family 正文阅读面：

- `MOBI`
- `AZW3`

如果 annotation split 只在 `EPUB/TXT` 上成立，那 feature audit 里这条能力仍然偏局部。

## 这一步做的不是新功能，而是把 Kindle-family secondary formats 拉进同一条证据链

位置：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

新增 focused regression：

- `persists MOBI and AZW3 highlights and notes separately through the desktop reader store`

流程和 `EPUB` 那条保持同级，不重新发明新产品钩子：

1. 通过真实 `import_library_books` 导入 sample library books
2. 逐个打开 `MOBI / AZW3` 的 `library-file` reader window
3. 在可见正文里选一段文本，创建 `高亮`
4. 再选另一段文本，创建 `笔记`
5. 先检查 notes 面板出现：
   - `1 高亮`
   - `1 笔记`
6. 再检查磁盘上的 host-side notes store 已经写出这两条记录
7. 关闭 reader
8. 从 library 重开同一本书
9. 再确认两条记录仍然存在

## 这一步顺手修掉了两个真实交互问题

这次不是单纯加测试。为了让 secondary foliate formats 的 annotation 行为真正稳定下来，还补了两个 runtime 收口：

1. `ReaderViewport` 里的 foliate 选区跟踪，不再在空选区时立刻把最近一次有效选区清掉  
   这避免了“刚选中文字，去点 sidebar 按钮时选区瞬间消失”的问题。

2. `notesController.addFromSelection()` 不再按 `cfi` 粗暴去重  
   以前如果两个标注落在同一 locator 上，后一个会把前一个直接顶掉。现在会保留多条 annotation，这是更合理的产品语义。

所以这一步的价值不是“桌面测试更多了”，而是：

- Kindle-family secondary formats 终于进入了与 `EPUB` 同等级的 annotation 持久化链路
- 同一阅读位置支持保留多条 annotation
- 选区到 sidebar 动作之间的交互更稳了

## 为什么这里先收 MOBI / AZW3，而不是把 FB2 一起强行算进来

`FB2` 当前仍有一个真实 gap：

- selection-to-annotation flow 还不够稳定

如果在这个状态下把 `FB2` 也一起写进证据，会把总账写虚。  
这一步选择先把已经能被稳定验证的 `MOBI / AZW3` 收实，而把 `FB2` 留成明确的下一刀。

这比一次把三种格式都写成“已对齐”更干净。

## 这一步之后的状态

现在 annotation split 的 desktop 证据已经覆盖到：

- `TXT`
- `EPUB`
- `MOBI`
- `AZW3`

仍然明确未收完的有：

- `FB2` 的 selection-to-annotation stability
- `CBZ` 仍然是显式不支持正文文本批注
- 更成熟的 annotation management surface 还没有

也就是说，这一步是在缩小 secondary text formats 和主格式之间的不一致，而不是 pretending 已经完成整条 annotation 产品线。
