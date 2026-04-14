# 0186: 让 Readest banner 统计在本地迁移后保持同步

## 这次改动解决什么

`br1` 的 Readest 迁移流程有两条路径：

- 正常点击同步，然后走完整 reload
- 在 `loadLibrary()` 里检测到空书库但本机存在 Readest 时，走 `reloadAfterImport = false` 的本地迁移捷径

问题在于第二条路径虽然会更新：

- `importedBooks`

但不会同步更新：

- `readestCompatibleCount`

于是页面会出现一种割裂：

- 书架里其实已经出现了 Readest 兼容条目
- banner 却还显示旧的兼容数量

这不是文案问题，而是状态回流不完整。

## 这次具体做了什么

### 1. 把“从持久化记录刷新书架状态”抽成统一 helper

文件：`src/routes/library/+page.svelte`

新增了两个 helper：

- `countReadestCompatibleRecords()`
- `applyPersistedLibraryRecords()`

前者专门负责数出当前 `PersistedLibraryBook[]` 里有多少条是 `readest-*` 兼容记录；  
后者负责一次性更新：

- `readestCompatibleCount`
- `importedBooks`

这样“书架内容”和“banner 统计”就不会再由不同分支各自维护。

### 2. `loadLibrary()` 改成统一走这套应用逻辑

文件：`src/routes/library/+page.svelte`

不管是：

- 普通加载书库
- 还是空书库下触发 Readest 本地迁移

现在最后都会经过：

- `applyPersistedLibraryRecords()`

这样同一份持久化记录会同时决定：

- 页面展示的书
- 当前已兼容的 Readest 数量

避免一边更新了、一边没更新。

### 3. 本地迁移捷径不再只拼接增量结果

文件：`src/routes/library/+page.svelte`

之前 `triggerReadestMigration({ reloadAfterImport: false })` 的分支会直接拿这次返回的记录增量去更新书架。

这有两个隐患：

- 兼容数量不会被同步刷新
- 如果本地已有状态被覆盖或替换，只看增量结果不够稳

现在这条路径改成：

- 重新读取当前持久化书库
- 再统一应用到 library 状态

这样最终页面展示的是“迁移后的完整真相”，而不是“本次操作返回的局部增量”。

## 这次学到的编程知识

### 知识点 1：一个页面里只要有两个状态来源，就容易漂移

这次的症状本质上是：

- `importedBooks` 在一个分支更新
- `readestCompatibleCount` 在另一个分支更新

只要它们不是从同一份源数据一起计算出来，就迟早会出现“列表变了，但计数没变”的问题。

更稳的做法是：

- 从同一份持久化记录
- 一次性派生所有相关 UI 状态

### 知识点 2：增量更新很方便，但对统计型 UI 往往不够安全

直接拿“本次返回的 records”去拼接页面看起来很快，但它通常只适合列表本身。

一旦页面还有：

- 汇总数量
- banner 文案
- 分类统计

增量更新就容易漏掉别的派生状态。

这时更可靠的策略往往是：

- 重新读取一次完整数据
- 用统一映射函数回填整个页面状态

## 这次没有处理什么

- 没有新增专门断言 banner 兼容数量的桌面回归
- 没有改 Readest 迁移的文案语义，只修状态同步
- 没有动 reader 侧逻辑，只处理 library 页面状态回流
