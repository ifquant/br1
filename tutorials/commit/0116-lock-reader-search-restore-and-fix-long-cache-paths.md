# 0116: 锁住 reader search 的 reopen 恢复链，并修掉长路径缓存落盘问题

这次提交处理的是同一条问题链：

1. 读者重新打开同一本书时，`search config/history` 可能在页面刚挂载时被默认值覆盖。
2. 桌面端 `reader-search` 缓存把完整 `bookKey` 做成 base64 目录名，真实 EPUB 路径一长就会撞上 macOS 单段文件名长度限制。
3. 之前没有一条稳定的桌面回归去锁住“关闭 reader -> 重开同一本 -> 恢复搜索状态 -> 用磁盘缓存回放结果”。

## 这次做了什么

### 1. 先修 hydration 顺序，再谈持久化

`src/routes/reader/+page.svelte`

以前的顺序大概是：

- 组件创建
- reactive 立刻把默认 `sidebarSearchConfig` 写入 `localStorage`
- `onMount()` 才去 `loadSearchConfig()`

这会导致一个典型问题：

- 你明明已经保存过 `matchCase=true`
- 但新窗口刚创建时，默认值 `{ matchCase: false }` 先写回本地存储
- 后面的读取只能读到被自己覆盖后的默认值

这次增加了一个 `canPersistSearchPrefs` 开关：

- `onMount()` 先 `loadSearchConfig()` / `loadSearchHistory()`
- 读完之后才允许 reactive 持久化重新生效

这样恢复链就变成了：

- 先读旧值
- 再允许后续修改写回

这就是 UI 状态恢复里很常见的“hydrate before persist”模式。

## 2. 把 search cache 的磁盘路径从可变长编码改成固定长度哈希

`src-tauri/src/lib.rs`

原来 `reader_search_cache_file()` 的路径生成方式是：

- 目录名 = `base64(book_key)`
- 文件名 = `base64(cache_key) + ".json"`

问题在于：

- `book_key` 里包含真实文件路径、文件大小、修改时间
- Readest 同步进来的书路径本来就很长
- base64 只会更长，不会更短
- macOS 对单个 path component 有长度上限

结果就是：缓存逻辑在真实书库上可能直接 `ENAMETOOLONG`

这次把它改成：

- `sha256(book_key)` 作为目录名
- `sha256(cache_key)` 作为文件名

好处：

- 长度固定
- 同一个 key 永远映射到同一个磁盘位置
- 不再依赖原始路径长度

注意：

- 这是路径编码策略变更，不是 cache schema 变更
- 旧 base64 路径下的缓存不会自动迁移
- 但新写入和新读取会稳定很多

## 3. 给 WDIO/Tauri 加一条真正的 reopen 恢复回归

`e2e/app.e2e.ts`

这条用例现在验证的是：

1. 选一本文本更稳定的 EPUB
2. 清掉旧的 search history/config/cache
3. 用 Node 侧直接往 Tauri 的真实 `app_data_dir/reader-search` 写入一份缓存文件
4. 在 reader 窗口里种入 `search history` 和 `search config`
5. 关闭 reader
6. 重新打开同一本书
7. 断言：
   - `matchCase` 选项恢复
   - 历史 query 恢复
   - 点击历史 query 后，可以直接从磁盘 cache 回放出结果

这里刻意没有继续依赖“正文搜索引擎一定能在测试环境里稳定搜到词”。

因为这条回归真正想锁住的是：

- reopen 后状态恢复有没有被冲掉
- disk cache 命名空间是不是和生产代码一致
- history -> replay 这条 UI 链路有没有断

## 这次顺手学到的两个点

### 知识点 1：恢复型状态最怕“先写后读”

只要一个状态既会：

- 从持久层恢复
- 又会被 reactive 自动写回

你就要先问自己：

- 是不是刚挂载时默认值会先把旧值覆盖掉？

如果答案可能是“会”，就应该做 hydration gate。

### 知识点 2：把用户路径直接编码进文件名，通常不是长期方案

很多人第一反应会写：

- `base64(path)`
- `encodeURIComponent(path)`

这在 demo 阶段看起来方便，但一旦进入真实桌面环境，就会碰到：

- 文件名长度限制
- 平台差异
- 非 ASCII 路径

更稳的做法通常是：

- “可读信息”放内容里
- “落盘路径”用固定长度 hash

## 这次验证怎么看

这次我实际跑了：

- `pnpm check`
- 单条 WDIO/Tauri 回归：
  `restores search history, options, and disk cache after reopening the same book`

我还跑了整份 `e2e/app.e2e.ts`，但它仍然有旧的 reader 加载 / CFI 相关失败。
所以这次提交应该被理解成：

- search restore 这条线被锁住了
- 不是整个 reader 桌面回归已经完全恢复健康
