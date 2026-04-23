# 0510: 给现有持久化数据补上可导入导出的 sync substrate 记录模型

这次做的不是“立即可见的同步 UI”，而是先把底层数据模型补齐。目标很明确：把今天已经真实落盘的几类数据，统一包装成以后能导出、能导入、能做冲突比较的 sync record 形状，但不提前把 P2-3.2 的快照按钮、文件选择器和恢复流程混进来。

## 这次改了什么

- `src/lib/sync/types.ts`
  - 新增统一的 sync record envelope。
  - 每条记录都明确带：
    - `schemaVersion`
    - `kind`
    - `id`
    - `updatedAt`
    - `scope`
    - `payload`
  - 这次先覆盖六类记录：
    - `library-book`
    - `reading-state`
    - `bookmarks`
    - `notes`
    - `highlights-workspace`
    - `reader-settings`
  - 还预留了基础 conflict 类型，方便后面的导入/远端同步流程直接复用。

- `src/lib/sync/model.ts`
  - 新增纯函数 builder，把现有持久化数据转成 sync records。
  - library 这边拆成两条记录：
    - 一本书的元数据记录
    - 一本书的阅读状态记录
  - bookmarks / notes / highlights workspace 这类“按 `bookKey` 落一整个文件”的持久化形状，这次也按“每个持久化作用域一条 sync record”来建模，而不是强行改成一堆更细但现在并不存在的存储单元。
  - reader settings 也补成独立 sync record，沿用当前 `READER_SETTINGS_STORAGE_KEY`。
  - 新增 restore helper，能把 sync record 再还原回当前 app 已经认识的持久化形状，为 P2-3.2 做准备。

- `src/lib/sync/index.ts`
  - 暴露后续 snapshot/import/export 会直接用到的 types 和 helpers。

- `src/lib/sync/model.test.ts`
  - 加了 fixture-style tests，覆盖：
    - library metadata / reading state record 的稳定 id 和 round-trip 还原
    - bookmarks / notes / highlights workspace 的 record 生成与还原
    - reader settings 的规范化和 fallback timestamp
    - library 批量转 substrate records

- `.planning/READEST-ALIGNMENT-CHECKLIST.md`
  - 把 P2-3.1 标记完成，并记录这次的真实验证命令和当前边界。

## 为什么 bookmarks / notes / highlights 没有改写产品内 id 逻辑

这次的要求里有两个边界要同时满足：

- 要有稳定 sync record id
- 不能改现有产品行为

当前代码里：

- 书签 id 是 `locator + Date.now()`
- note/highlight id 是 `cfi + Date.now()`

这些 item id 对“单条记录本身”来说不是理想的跨设备全局 id，但它们已经是今天真实持久化的一部分。如果这次直接改 UI/controller 的写入规则，就不再是“substrate model only”，而是会变成一次行为切片。

所以这次做法是：

- sync record 自己的 envelope id 必须稳定
- 能直接复用 durable id 的地方就直接复用
- 对“整份持久化文件”这种作用域，用 `bookKey` 或 `storageKey` 推导稳定 record id
- 暂时不改现有 annotation item 的生成方式

这样可以先把同步容器建起来，同时不冒险影响当前 reader 行为。

## stable id 这次怎么来的

- library metadata: `library-book:${book.id}`
- reading state: `reading-state:${book.id}`
- bookmarks: 用 `bookKey` 做稳定哈希，得到 `bookmarks:<hash>`
- notes: 用 `bookKey` 做稳定哈希，得到 `notes:<hash>`
- highlights workspace: 用 `bookKey` 做稳定哈希
- reader settings: 用 `storageKey` 做稳定哈希

注意这里稳定的是“sync record 的身份”，不是说每个内部数组元素都被这次重写了身份规则。

## updatedAt 这次怎么处理

同步记录除了要知道“我是谁”，还要知道“我最后什么时候变更过”。

这次优先吃现有持久化里已经存在的时间字段：

- library metadata: `importedAt`
- reading state: `lastOpenedAt`，没有就退回 `importedAt`
- bookmarks: 取书签数组里最大的 `createdAt`
- notes: 取注释数组里最大的 `createdAt`
- highlights workspace: 取 saved selection 的 `createdAt` / `importedAt` 最大值

reader settings 今天没有单独的“最后修改时间”字段，所以这次 builder 支持传 `fallbackUpdatedAt`。后面的 snapshot/export 流程可以在真正导出时给它一个明确时间戳。

## 为什么要加 restore helper

“可导入”不只是定义一个 TypeScript type。

如果以后做 P2-3.2 的本地快照恢复，代码最终还是得落回当前 app 真正会写入的几种形状，比如：

- `PersistedLibraryBook`
- `ReaderBookmark[]`
- `ReaderNote[]`
- `ReaderHighlightsWorkspaceState`
- `ReaderSettings`

所以这次顺手把“record -> 当前持久化形状”的还原 helper 一起补上。这样后面做 snapshot import 时，不需要再临时推倒重想一遍数据边界。

## 新手知识点

“同步模型”和“当前数据库/文件格式”不是一回事。

一个常见误区是：既然本地已经存了 JSON，那把 JSON 原样打包导出不就行了吗？问题在于，本地存储往往是“按功能分散设计”的：

- 书库一本书一个关注点
- reader settings 又在另一处
- bookmarks / notes / workspace 还是按 `bookKey` 分文件

这些格式适合本地读写，但不一定适合做跨设备同步。  
sync substrate 的作用，就是在“不破坏现有产品行为”的前提下，先定义出一层更稳定、更可比较、也更适合导入导出的记录模型。后面的 snapshot、远端 provider、冲突解决，都会建立在这一层之上。
