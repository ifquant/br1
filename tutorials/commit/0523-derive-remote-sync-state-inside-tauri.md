# 0523 - 把 remote sync 本地状态收回到 Tauri

这一刀修的是一个明确的 trust-boundary 问题：`Readest Cloud` 和 `KOReader remote` 之前都接受 renderer 组装的本地同步状态，再让 Tauri 带着桌面侧凭据去比较、上传、拉取。

这会把“谁拥有本地真实状态”这个边界倒过来。只要 renderer 被 XSS、调试脚本、或错误调用污染，就可以伪造同步内容，甚至让 Tauri 用本机 token / user key 去替它发不该发的请求。

相关文件：

- [`src-tauri/src/commands/sync_snapshot.rs`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src-tauri/src/commands/sync_snapshot.rs)
- [`src-tauri/src/commands/remote_sync.rs`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src-tauri/src/commands/remote_sync.rs)
- [`src-tauri/src/commands/koreader_remote_sync.rs`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src-tauri/src/commands/koreader_remote_sync.rs)
- [`src-tauri/src/models.rs`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src-tauri/src/models.rs)
- [`src/lib/sync/remote.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/sync/remote.ts)
- [`src/lib/library/desktopPage.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/library/desktopPage.ts)

## 这刀做了什么

1. 在 Tauri 侧重建当前本地 sync snapshot

   `sync_snapshot.rs` 新增了 `load_current_sync_snapshot(...)`，直接从桌面持久化层读取：

   - `library.json`
   - 每本书的 bookmarks
   - 每本书的 notes
   - 每本书的 highlights workspace

   然后在 Rust 侧重新组装 `SyncSnapshotDocument`，而不是信 renderer 传来的快照。

2. Readest Cloud remote sync 不再吃 renderer 的本地快照

   `RemoteSyncRequest` 现在只保留：

   - `provider`
   - `operation`

   `run_remote_sync(...)` 会先在 Tauri 里调用 `load_current_sync_snapshot(...)`，再做：

   - 本地 fingerprint 计算
   - 远端比较
   - 冲突判断
   - 上传

   这样桌面 token 对应的“本地真相”重新回到了桌面侧。

3. KOReader remote sync 不再吃 renderer 的 progress entries

   `run_koreader_remote_sync(...)` 现在会从 `library.json` 直接派生可同步的本地进度：

   - 先优先使用 `koreaderProgressLocation`
   - 再退回可兼容的 `progressLocation`
   - 最后才尝试页码/数字进度

   renderer 仍然可以为了 UI 预检查去本地构造 entries，但 Rust 端不再以它们为准。

4. KOReader pull 的 path segment 改成 URL-safe 拼接

   之前 `syncs/progress/{document}` 直接字符串拼接，`document` 里如果出现 `/`、`?`、`..` 这类字符，会把请求路径带歪。

   现在改成 `Url::path_segments_mut().push(document)`，由 URL 层做 path segment 编码。

## 为什么这刀重要

同步功能不是普通 UI 逻辑，它会动用：

- 本机配置里的 cloud token
- KOReader server 的 user key
- 本地持久化阅读状态

所以这里不能让 renderer 说“本地状态是什么”，然后 Tauri 只是代签名、代发请求。真正该握住边界的是：

- Tauri 读本地状态
- Tauri 决定上传什么
- renderer 只触发操作并展示结果

这刀就是把这条边界重新拉回正确位置。

## 验证

- `cargo check --manifest-path /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src-tauri/Cargo.toml`（PASS）
- `pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec check`（PASS）
- `git -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec diff --check`（PASS）

## 没有包含

- 没有修 `apply_sync_snapshot` 这条原生命令写入面；它仍然需要单独再收一刀
- 没有把 reader settings 迁进 Tauri-owned 持久化；这次的本地 snapshot 重建只覆盖文件系统里已有的同步基底
