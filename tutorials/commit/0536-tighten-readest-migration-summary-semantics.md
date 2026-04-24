# 0536 - 收紧 Readest 本地迁移的 summary 语义

这刀对应 `P3-2.2`，目标不是再扩更多 Readest 导入能力，而是把当前已有能力说清楚。

之前 `br1` 的 Readest 本地迁移面有一个明显问题：

- banner 只说“发现了多少本”
- 也说“已有多少本以兼容方式进入 br1”
- 但没有说剩下那些到底是“还可以继续兼容”，还是“只剩记录，本地文件已经没了”

这会把“检测到 Readest 记录”误说成“这些书都还能兼容进来”。

相关文件：

- [`/Users/dev/workspace2/hc_apps/br1/src-tauri/src/commands/library.rs`](/Users/dev/workspace2/hc_apps/br1/src-tauri/src/commands/library.rs)
- [`/Users/dev/workspace2/hc_apps/br1/src-tauri/src/models.rs`](/Users/dev/workspace2/hc_apps/br1/src-tauri/src/models.rs)
- [`/Users/dev/workspace2/hc_apps/br1/src/lib/services/libraryPersistence.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/services/libraryPersistence.ts)
- [`/Users/dev/workspace2/hc_apps/br1/src/lib/library/desktopCatalog.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/desktopCatalog.ts)
- [`/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryPageChrome.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryPageChrome.svelte)
- [`/Users/dev/workspace2/hc_apps/br1/src/lib/library/body.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/body.ts)

## 这刀做了什么

1. `detect_readest_library` 不再只返回总数

Rust 侧的 `ReadestLibrarySummary` 现在除了总数，还会额外返回：

- `importableCount`
- `missingFileCount`

它们的含义是：

- `importableCount`: 当前还能在 Readest 本地目录里找到真实书籍文件，理论上仍可兼容进 br1
- `missingFileCount`: 只剩下 Readest 记录，但对应本地书籍文件已经缺失，当前不能直接兼容

这一步很重要，因为产品终于开始区分：

- “检测到了记录”
- “还能实际兼容”

这两个之前一直被混在一起。

2. `readestCompatibleCount` 不再把坏掉的兼容记录也算进去

之前前端是按 `record.id.startsWith('readest-')` 计数。

这会把两类东西混在一起：

- 还保留书库副本、当前真能打开的 Readest 兼容记录
- 兼容记录还在，但书库副本已经丢了的失效记录

现在 `countReadestCompatibleRecords(...)` 会额外要求：

- `libraryFileExists !== false`

所以 banner 里的“已有多少本可用兼容记录”终于开始说真话，而不是只数历史上曾经导进来的条目。

3. banner 文案改成“检测 / 可兼容 / 已兼容 / 缺失”四层语义

[`LibraryPageChrome.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryPageChrome.svelte) 现在会明确区分：

- 本机检测到多少本 Readest 藏书
- 其中多少本当前仍保留本地文件，可兼容进 br1
- 多少本只剩记录，暂时无法兼容
- br1 里当前已经有多少本可用兼容记录

而按钮文案也不再一律写成“同步 Readest 藏书”：

- 有可兼容文件时，写成“同步 N 本可兼容的 Readest 藏书”
- 没有可兼容文件时，只给“重新检查 Readest 书库”

这样用户不会再被暗示“点一下就能同步所有检测到的书”。

4. 空书库入口也同步到同一语义

空书库场景下，[`body.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/body.ts) 的 message 和 secondary action 现在也跟着 summary contract 走：

- 如果还有可兼容的 Readest 本地文件，就提示可以先兼容进来
- 如果只剩 Readest 记录、文件已经缺失，就明确告诉用户当前只能先从本机重新导入

这样空态入口和顶部 banner 不再像两套不同产品。

## 为什么这刀值得单独提交

因为这是典型的“功能看起来在，但产品在撒谎”的问题。

用户最容易被误导的不是：

- 兼容功能不存在

而是：

- 页面说检测到了很多 Readest 书
- 用户自然会以为这些书大多还可以同步进来
- 但实际上其中一部分已经只剩记录，没有可用文件

把这个边界说清楚，本身就是产品能力的一部分。

## 验证

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`（PASS）
- `cargo check --manifest-path /Users/dev/workspace2/hc_apps/br1/src-tauri/Cargo.toml`（PASS）
- `cd /Users/dev/workspace2/hc_apps/br1 && pnpm dlx tsx --test ./src/lib/library/page.test.ts ./src/lib/library/desktopCatalog.test.ts`（PASS）
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`（PASS）

## 没有包含

- 没有新增更多 Readest 导入字段或迁移协议
- 没有把导入流程改成增量 reconciliation engine
- 没有继续扩张到 cloud sync；这刀只收本地 Readest summary 和兼容文案边界
