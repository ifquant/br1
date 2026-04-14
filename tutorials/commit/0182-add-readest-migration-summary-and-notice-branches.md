# 0182: 给 Readest 迁移补导入汇总和更准确的提示语义

## 这次改动解决什么

之前 `br1` 从 `Readest` 同步藏书时，前端只知道“拿到了一批记录”或者“结果为空”。

这会带来两个问题：

- 如果 `Readest` 里明明检测到了很多书，但其中一部分本地文件已经丢失，library 只能提示“没有导入到可用书籍”，信息太粗。
- 如果某些 `readest-*` 条目其实是重新同步覆盖旧兼容记录，library 也完全不知道，只能把它们都当成全新导入。

所以这一步的目标，是把迁移结果从“只有 records”升级成“records + 汇总信息”，让 library 能给出更真实的同步反馈。

## 这次具体做了什么

### 1. Tauri 命令返回正式的 Readest 迁移汇总对象

文件：

- `src-tauri/src/models.rs`
- `src-tauri/src/commands/library.rs`

新增了 `ReadestImportResult`，字段包括：

- `records`
- `totalDetected`
- `importedCount`
- `replacedCount`
- `skippedMissingFiles`

这样 Rust 侧不再只返回一组 `LibraryBookRecord`，而是把本次迁移的整体结果一次性交代清楚。

同时 `import_readest_library` 现在会显式统计：

- 总共读到了多少条 `Readest` 记录
- 真正导入了多少本
- 有多少本是替换已有 `readest-*` 兼容条目
- 有多少条因为找不到原始本地文件而被跳过

### 2. service 层把空结果也带上汇总字段

文件：`src/lib/services/libraryPersistence.ts`

这一步很关键。

如果只在 `kind === "imported"` 时附带汇总信息，那么一旦出现：

- 检测到很多 Readest 记录
- 但因为文件缺失，一本都没能兼容进来

前端仍然只会看到一个简单的 `empty`，那就又回到了旧问题。

所以现在：

- `importReadestLibrary()` 返回完整 `ReadestImportSummary`
- `importBooksFromReadest()` 会把 summary 写回 `LibraryImportActionResult`
- 连 `empty` 分支也会保留 `totalDetected / skippedMissingFiles / replacedCount`

这样 library 页面即使面对“零导入”结果，也能知道到底发生了什么。

### 3. library notice 改成按迁移结果分支生成

文件：`src/routes/library/+page.svelte`

新增了 `describeReadestMigrationResult()`，把同步结果拆成更准确的提示：

- 发现了记录，但全部因为本地文件缺失而无法兼容
- 成功同步了若干本
- 同步时刷新了若干本已有兼容记录
- 同时跳过了若干本缺失文件的条目

这样顶部 notice 不再只是：

- “成功”
- “失败”
- “空”

而是能告诉用户：

- 到底同步到了多少
- 有多少是刷新旧兼容记录
- 有多少是因为 `Readest` 本地文件不完整而被跳过

### 4. 不 reload 时也保持导入结果和书架数据一致

文件：`src/routes/library/+page.svelte`

这次顺手把 `reloadAfterImport = false` 的分支也补完整了。

之前这段逻辑里拿了 `records` 却没真正消费它；现在在不 reload 的情况下，会把导入结果立即映射成书架 view model，避免“提示已经同步了，但当前页面没反映”的割裂感。

## 这次学到的编程知识

### 知识点 1：跨层协议不要只传“主数据”，也要传“结果语义”

很多时候我们容易只传：

- `records`

但用户真正需要的往往还包括：

- 总共尝试处理了多少
- 成功了多少
- 跳过了多少
- 为什么跳过

这种“结果语义”如果不从底层往上带，UI 就只能猜。

### 知识点 2：空结果不是单一状态

`empty` 看起来像一个简单状态，但它可能代表很多不同情况：

- 用户真的没有任何数据
- 检测到了数据，但都不满足条件
- 检测到了数据，但文件已经丢失

所以做状态设计时，最好别只看“有没有结果”，而要看“为什么没有结果”。

## 这次没有处理什么

- 没有继续扩 Readest 字段兼容面，只补了迁移汇总和提示语义
- 没有增加新的桌面端 Readest 迁移自动化用例
- 没有改 reader 打开 Readest 兼容书籍后的阅读表现，只处理了 library 同步反馈
