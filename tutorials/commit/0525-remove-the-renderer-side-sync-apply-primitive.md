# 0525 - 移除 renderer 侧的 sync apply 原语

这一刀不是做新能力，而是把一个危险的写入入口从产品面上拿掉。

问题不在“能不能写文件路径”，而在“renderer 能不能直接把一整份同步状态塞给 Tauri，让它清空本地状态后整库重写”。之前的 `apply_sync_snapshot` 就是这个入口。

相关文件：

- [`src-tauri/src/commands/sync_snapshot.rs`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src-tauri/src/commands/sync_snapshot.rs)
- [`src-tauri/src/commands/remote_sync.rs`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src-tauri/src/commands/remote_sync.rs)
- [`src-tauri/src/models.rs`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src-tauri/src/models.rs)
- [`src-tauri/src/lib.rs`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src-tauri/src/lib.rs)
- [`src/lib/services/syncSnapshot.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/services/syncSnapshot.ts)
- [`src/lib/library/desktopPage.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/library/desktopPage.ts)
- [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/routes/library/+page.svelte)

## 这刀做了什么

1. `apply_sync_snapshot` 不再暴露给 renderer

   以前 renderer 可以直接调用：

   - 传一组 `libraryBooks`
   - 传一组 `bookmarks`
   - 传一组 `notes`
   - 传一组 `highlightsWorkspace`

   然后 Tauri 就把本地状态整批重写。

   现在这条 invoke surface 已经从 [`lib.rs`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src-tauri/src/lib.rs) 移掉了。

2. 本地快照恢复改成 Tauri 内部执行

   新增的 `restore_sync_snapshot_dialog` 会在 Tauri 里完成整条链路：

   - 打开文件选择器
   - 解析并验证 snapshot
   - 重建 restore request
   - 应用到本地持久化层
   - 把计数结果和可选的 reader settings record 返回给 renderer

   renderer 不再参与组装 bulk apply request。

3. `Readest Cloud pull` 也改成 Tauri 内部应用

   `run_remote_sync` 在 `pull` 成功后，现在会直接在 Tauri 内部应用远端 snapshot，再把：

   - apply 计数
   - reader settings record
   - 用户提示文案

   返回给页面。

4. snapshot restore 前增加了更严格的 record-level 验证

   `sync_snapshot.rs` 现在会显式校验：

   - `library-book` / `reading-state` 的 id、scope、payload 一致性
   - 每本书不能有重复 metadata / reading-state
   - 每个 `bookKey` 不能有重复 bookmarks / notes / highlights-workspace
   - 不能有不属于当前导入 library 的 state record
   - `reader-settings` 只能写到 `br1.reader.settings`

## 为什么这刀重要

这类问题的本质不是“文件路径是不是绝对路径”，而是“谁有资格定义本地真实状态”。

如果 renderer 可以直接定义整份 snapshot apply request，那么一旦 renderer 被污染，Tauri 就会变成一个原生签名的 bulk overwrite 执行器。

正确的边界应该是：

- Tauri 读取、验证、应用可信 snapshot
- renderer 只发起高层动作并展示结果

这刀就是把这条边界重新收回去。

## 当前取舍

为了先把危险入口彻底拿掉，这一刀先保住了两条 Tauri-owned 恢复路径：

- 本地 sync snapshot 恢复
- Readest Cloud pull 后的本地应用

`KOReader exchange import` 和 `KOReader remote pull` 的 merge/apply 还没有搬进 Tauri，所以这轮先显式锁住，不再继续走旧的 renderer bulk apply 路径。

## 验证

- `cargo check --manifest-path /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src-tauri/Cargo.toml`（PASS）
- `cargo test --manifest-path /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src-tauri/Cargo.toml sync_snapshot`（PASS）
- `cargo test --manifest-path /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src-tauri/Cargo.toml remote_sync`（PASS）
- `pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec check`（PASS）
- `cd /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec && pnpm dlx tsx --test ./src/lib/sync/remote.test.ts`（PASS）
- `git -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec diff --check`（PASS）

## 没有包含

- 没有把 KOReader exchange merge/apply 搬进 Rust；这会是下一刀
- 没有把 KOReader remote pull merge/apply 搬进 Rust；这也会是下一刀
