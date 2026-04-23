# 0514: 给 KOReader adapter 接上第一版可见导入导出 workflow

这一刀完成 `P2-4.2 Add KOReader sync workflow`，但范围仍然是可控的本地 workflow，不是直接跳去做 KOReader 远端协议。

这次的目标是把上一刀已经有的 adapter 变成用户真的能点到、能跑通、能看到冲突结果的一条路径：

- 在 library “更多操作”菜单里加 KOReader 导入导出入口
- 通过 Tauri-owned dialog 保存/打开 KOReader exchange 文件
- 导入时只应用可唯一匹配且无冲突的书
- 其余条目不 hard-stop 整批，而是跳过并给出明确冲突汇总

## 1. 为什么这一步不直接上 KOReader 远端协议

如果这一刀直接去做 KOReader server：

- 就要同时处理 server URL
- 认证
- LAN / TLS 容忍
- renderer/network boundary
- 书籍匹配 contract

这样会把 `workflow` 和 `trust boundary` 两个问题混在一起，审起来很差。

所以这次先做的是一个更稳的中间层：

- `br1-koreader-sync-*.json`
- 里面装的是 `br1` 当前 snapshot 投影出来的 KOReader exchange document
- 文件读写通过 Tauri dialog

这样用户已经有了“可见 workflow”，但我们还没有把 app 变成任意 KOReader 代理。

## 2. 新 workflow 的核心结构

这次新增的关键文件是：

- [koreaderSync.ts](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/services/koreaderSync.ts)
- [sync_snapshot.rs](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src-tauri/src/commands/sync_snapshot.rs)

前端这边做两件事：

1. `createKoReaderSyncExchangeFromSnapshot(snapshot)`
   - 把当前 `br1` sync snapshot 变成 KOReader exchange document
2. `mergeKoReaderSyncExchangeIntoSnapshot(currentSnapshot, document)`
   - 把导入文件按“可安全应用”的原则合并回当前 snapshot

Tauri 这边做两件事：

1. `save_koreader_sync_exchange_dialog`
2. `load_koreader_sync_exchange_dialog`

也就是说，这次没有把 KOReader workflow 直接写进 reader 或 network service，而是把它挂在现有 library sync 面的同一层。

## 3. 为什么导入时选择“部分应用 + 冲突汇报”

这次最重要的设计决定是：

- 不做整批 hard-stop
- 也不做“看起来能对上就全覆盖”

而是：

- 唯一匹配且无冲突：应用
- 未匹配：跳过
- 匹配歧义：跳过
- 本地更近更新：跳过

原因很直接。

### 3.1 整批 hard-stop 太脆

如果 30 本里只有 1 本有问题，整批 hard-stop 会让前 29 本也无法导入。

这在本地 exchange 文件 workflow 里太保守了，会让功能看起来“几乎不能用”。

### 3.2 全量覆盖又太危险

如果只靠题名、作者、格式去猜，或者无视本地更新时间直接覆盖，那就会把 trust boundary 从“文件安全”退化成“语义不安全”。

这类错误不会像路径注入那样立刻炸，但会悄悄污染用户的数据。

所以这次选的是中间路线：

- 文件边界安全
- 语义边界也尽量保守

## 4. 书籍匹配 contract 是怎么定的

导入时按下面顺序找本地书：

1. `bookId`
2. `filePath`
3. `sourcePath`
4. 唯一的 `title + author + format`

如果最后一步命中多本，就算冲突，不会猜。

这条 contract 有两个好处：

- 对我们自己导出的 exchange 文件，匹配通常是稳定的
- 对用户手动搬动过路径或部分迁移过书库的情况，也还保留一个保守 fallback

但它没有装作“永远能匹配”。匹配失败和歧义都是真实结果，会进入 conflict report。

## 5. 为什么这次在 snapshot 上做 merge

这刀没有新做一个“部分 apply 到持久化层”的命令，而是：

1. 先读当前完整 snapshot
2. 在内存里做 KOReader merge
3. 再走现有 `prepareSyncSnapshotRestore -> applySyncSnapshot`

这样做非常关键，因为当前 `applySyncSnapshot(...)` 是“整套状态恢复”模型：

- library books
- bookmarks
- notes
- highlights workspace
- reader settings

如果直接把 KOReader 导入结果当成一小部分 request 传进去，就会把未包含的书签/笔记清空。

所以这次正确做法不是改 apply 语义，而是先把 KOReader 数据 merge 进当前 snapshot，再恢复整套状态。

这也解释了为什么这一步非常适合做成 service-layer workflow，而不是一上来去改 Tauri apply contract。

## 6. 菜单入口为什么放在现有 sync 区里

这次没有再做新页面，而是把按钮直接挂到现有 library “更多操作”菜单：

- 导出 KOReader 交换文件
- 导入 KOReader 交换文件

这和本地 sync snapshot / remote sync 是同一层问题：

- 都是 library 级别的状态交换
- 都依赖当前 snapshot
- 都要给出 notice 和冲突信息

如果为了 KOReader 新做一页，只会把还很早期的 workflow 面积放大。

## 7. 这次测试真正证明了什么

新加的 [`koreaderSync.test.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/services/koreaderSync.test.ts) 证明了三件事：

1. 可以从当前 snapshot 产出一份稳定的 KOReader exchange document
2. 导入时能合并唯一匹配的书，并保留未匹配冲突
3. 当本地记录更新得更晚时，会跳过旧导入，不会倒灌旧状态

这第三条尤其重要，因为它让这条 workflow 至少具备最基本的“不会轻易把更新的本地记录覆盖掉”的安全性。

## 8. 这一步故意没做什么

这次还没有做：

- KOReader server 连接
- 用户名 / key / device settings
- LAN server / custom server 配置
- KOReader 远端 push/pull
- style/color/xpointer 区间的持久化级保真

原因不是忽略，而是它们会把问题切换到另一类：

- network boundary
- auth boundary
- remote conflict semantics

这应该是下一阶段的事，不适合塞进第一版可见 workflow commit。

## 9. 到这里，KOReader 这一线的状态

现在 KOReader 这条线已经有两层闭合：

1. `P2-4.1`
   - adapter mapping
2. `P2-4.2`
   - visible local exchange workflow

也就是说，`br1` 现在已经不是“有一堆 KOReader helper 但用户碰不到”，而是真正有了一条可跑、可导入、可导出、可报告冲突的路径。

下一步如果继续往前推，就该去做真正的 KOReader remote/server integration，而不是再反复补本地文件流程的小装饰。
