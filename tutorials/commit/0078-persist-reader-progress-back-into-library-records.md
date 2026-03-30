# 0078 把 reader 的阅读进度回写到书库记录

这次提交的目标，是让 `br1` 更接近 `Readest` 的“书库不是静态展示，而是会沉淀阅读状态”的能力链。

之前 `br1` 已经能：

- 从 `library` 导入书
- 打开 `reader`
- 在 `reader` 里拿到真实 `title / chapter / progress`

但这些状态只存在于当前窗口里。窗口一关，`library` 里的卡片还是老样子。这个提交补上的，就是：

- 当 `reader` 正在读一本来自本地书库的书时
- 把当前章节和进度回写到 `library.json`
- 下次回到 `library`，书卡能显示更真实的“继续阅读”状态

## 这次改了什么

1. 给 Tauri 后端增加 `update_library_reading_state`

文件：

- `/Users/dev/workspace2/hc_apps/br1/src-tauri/src/lib.rs`

这条命令做的事情很简单：

- 读 `library.json`
- 按 `file_path` 找到对应书籍
- 用最新的 `title / author / chapter / progress` 更新记录
- 再把 JSON 写回去

这里的关键点是：**我们不用前端直接改 JSON**，而是继续让宿主侧负责落盘。这样 Svelte 只负责“发阅读状态”，不负责“决定文件系统怎么写”。

## 2. 前端服务层补一层调用

文件：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/services/libraryPersistence.ts`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/services/index.ts`

这里新增了 `updateLibraryReadingState(...)`，目的是让页面层继续只依赖服务，而不是直接 `invoke(...)` Rust 命令。

这是很典型的“前端应用服务层”做法：

- 页面和组件只表达意图
- 真正的宿主桥接细节收在 service 里

## 3. 在 reader 路由里做节流回写

文件：

- `/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte`

只有一种场景会触发回写：

- 当前书是通过 `source=library-file` 打开的

也就是说：

- 打开临时资产
- 打开样例资源
- 未来的其它一次性来源

这些都不会污染正式书库。

另外这里没有在每次 `relocate` 事件发生时立刻写盘，而是加了 `500ms` 的定时器。这是为了避免翻页或拖动进度条时连续高频写 JSON。

## 这次能学到的 2 个编程点

### 知识点 1：为什么“状态回写”最好按来源做 gating

如果你不区分来源，所有打开过的内容都会尝试落盘：

- library 里的正式书
- 临时打开的文件
- 样例资源
- 将来的网络文档

这样书库就会被大量临时状态污染。

所以这次用：

- `source=library-file`

作为正式书库回写的 gating 条件。  
这就是一个很常见的工程思路：**不是所有状态都值得持久化，要先判定它是不是“正式对象”。**

### 知识点 2：为什么 UI 状态不要直接频繁写磁盘

阅读器里的位置更新会很频繁：

- 翻页
- 拖动进度条
- 重定位

如果每次都直接写 `library.json`：

- I/O 会很多
- 后端命令会频繁触发
- 以后如果持久化层变复杂，性能和竞争问题会更明显

所以这次用了一个最小节流：

- 每次新状态来时先 `clearTimeout`
- 最后一次稳定下来后再写

这类模式在前端里很常见，本质上就是：

- **UI 可以高频变化**
- **持久化要低频、稳定地落盘**

## 这次还没做什么

- 还没有把 `lastOpenedAt` 单独存进书库记录
- 还没有把 `reader` 的真实位置恢复做成下次自动回到上次页
- `library` 也还没有按“最近阅读”做更成熟的排序策略

这次只补了最小但真实的一条链：

`reader 的实时状态 -> 书库记录更新`
