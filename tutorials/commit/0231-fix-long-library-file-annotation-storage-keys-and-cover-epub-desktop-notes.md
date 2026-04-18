# 0231: 修掉长 `library-file` key 的标注存储上限，并补上 EPUB 主路径桌面证据

前一刀已经把：

- `高亮`
- `笔记`

拆成了真正独立的产品动作，`TXT` 也已经有 desktop regression。  
但当我继续把同一条链路补到 `EPUB` 主路径时，focused desktop regression 暴露了一个更真实的问题：

- UI 里能看到刚创建的 `高亮` 和 `笔记`
- 关闭重开后却全没了
- 不是 annotation 逻辑坏了，而是 host-side notes store 根本没写成功

## 根因：notes / bookmarks 文件名直接由完整 `bookKey` 推出来，长 EPUB 路径会直接顶到文件名上限

桌面 notes / bookmarks 之前用的是：

- `base64(bookKey) + ".json"`

这里的 `bookKey` 在 desktop `library-file` 路径下其实是：

- `br1.reader.notes:/绝对路径/到/某本书.epub`

对 `Readest` 迁移进来的长 EPUB 路径，这会生成一个非常长的文件名。  
我在本地 `reader-notes/` 里直接扫到了一批已经接近或到达 `255` 字符上限的旧文件名，而当前这条 `EPUB` regression 选中的书正好越界，所以结果就是：

1. sidebar state 正常更新
2. `save_reader_notes` 实际写文件失败
3. 重开后 notes 为空

这解释了为什么：

- `TXT` 样本能过
- 某些更长路径的 `EPUB` 主书路径却会静默丢失标注

## 这一步真正改了什么

### 1. 把 notes / bookmarks 的 host-side 文件名合同改成哈希

位置：

- `/Users/dev/workspace2/hc_apps/br1/src-tauri/src/util.rs`

新增了统一的：

- `reader_storage_component_key()`

现在：

- `reader_notes_file()`
- `reader_bookmarks_file()`

都不再直接用 base64 路径，而是改成：

- `sha256(bookKey).json`

这样长 `library-file` key 不会再因为文件名长度炸掉。

### 2. 保留旧文件回读，避免把已有 notes / bookmarks 弄丢

同样在：

- `/Users/dev/workspace2/hc_apps/br1/src-tauri/src/util.rs`
- `/Users/dev/workspace2/hc_apps/br1/src-tauri/src/commands/notes.rs`
- `/Users/dev/workspace2/hc_apps/br1/src-tauri/src/commands/bookmarks.rs`

补了：

- `legacy_reader_notes_file()`
- `legacy_reader_bookmarks_file()`

读取逻辑现在是：

1. 先读新的 hash 文件
2. 没有再退回旧的 base64 文件

写入逻辑则是：

1. 永远写新 hash 文件
2. 如果旧文件存在，就顺手删掉

这意味着这一步不是简单改路径，而是把桌面标注存储合同正式迁移到了安全版本。

### 3. 给 EPUB 主路径补上真正的 desktop annotation regression

位置：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

这次新增了两个关键 helper：

- `readerNotesFilePath()`
- `loadReaderNotesOnDisk()`

并新增 focused regression：

- `persists epub highlights and notes separately through the desktop reader store`

流程是：

1. 打开一本文库里的可用 `EPUB`
2. 在 `foliate` 可见正文里选中第一段文本，创建 `高亮`
3. 再选中第二段文本，创建 `笔记`
4. 先直接检查磁盘上的 host notes 文件，确认两条记录已经落盘
5. 关闭 reader
6. 从 library 重开同一本书
7. 再确认：
   - `1 高亮`
   - `1 笔记`
   - 高亮文本存在
   - 笔记正文存在

这条 regression 的价值不只是“多一条测试”，而是它直接卡住了：

- `EPUB` 主路径
- desktop host store
- 长 `library-file` key
- highlight / note split

也正是这条链路把根因揪出来了。

## 额外顺手收的点

在：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/notesController.ts`

我顺手把 desktop notes persist 补成了显式 `.catch(...)`，这样以后如果 host-side save 再炸，至少不会只表现成“重开后没了”，而会先在控制台里留下明确错误。

## 这一步之后，产品面上真正变好的是什么

不是“又多一个测试”，而是：

- desktop `EPUB` 主路径终于有了和 `TXT` 同等级的 annotation split 证据
- host-side notes / bookmarks store 不再被长路径 EPUB 随机打爆
- 已有旧 notes / bookmarks 文件不会因为这次合同升级而丢失

这让 `Annotations and Highlighting` 这条 capability 的状态更可信：

- 不再只是 plain-text 上成立
- 真正进入了 `EPUB` 主路径

## 还没做的事

这一步依然没有把 annotation 整条线做满：

- `FB2 / MOBI / AZW3` 还没有同等级的 highlight/note desktop evidence
- `CBZ` 仍然是显式不支持正文文本批注
- 还没有独立 highlight workspace
- 还没有更成熟的 annotation management surface

所以这一刀的定位很明确：

- **先修掉 desktop 主路径上的存储合同 bug**
- **让 EPUB 的 highlight / note split 真的能持久化**
- **再把这条主路径收成 focused regression**
