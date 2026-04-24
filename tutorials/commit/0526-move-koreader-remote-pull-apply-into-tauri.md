# 0526 - 把 KOReader remote pull apply 收回到 Tauri

上一刀把 `apply_sync_snapshot` 从 renderer invoke surface 拿掉以后，`KOReader remote pull` 也跟着被临时锁住了。原因很直接：它原来还是先在 renderer 里合并 snapshot，再借 bulk apply 入口落地。

这一刀只做一件事：把 `KOReader remote pull` 的本地应用搬回 Tauri。

相关文件：

- [`src-tauri/src/commands/koreader_remote_sync.rs`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src-tauri/src/commands/koreader_remote_sync.rs)
- [`src/lib/library/desktopPage.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/library/desktopPage.ts)

## 这刀做了什么

1. `pull` 成功后的本地更新改成 Rust 直接写 `library.json`

   `run_koreader_remote_sync` 在 `pull` 成功后，现在会：

   - 读取当前 library records
   - 用 KOReader 文档哈希匹配唯一的本地图书
   - 跳过歧义匹配
   - 跳过本地更新更晚的记录
   - 只更新阅读状态相关字段

   包括：

   - `progress`
   - `progressFraction`
   - `koreaderProgressLocation`
   - `lastOpenedAt`

   而不会去碰本地 `progressLocation` 的 reopen 语义。

2. 页面端移除临时锁定，恢复 remote pull 可用

   `desktopPage.ts` 不再把 `KOReader remote pull` 直接提示成“安全收口未完成”。
   现在成功后会重新加载 library，并展示 Rust 侧返回的应用/跳过摘要。

3. 补了纯 Rust 单测压住匹配语义

   这次的测试不依赖 Tauri app handle，只验证最关键的合并规则：

   - 唯一匹配时更新进度，并保留本地 CFI reopen 字段
   - 歧义匹配时跳过
   - 本地更新时间更晚时跳过

## 为什么这刀重要

`KOReader remote pull` 是一个很适合先收回 Tauri 的点，因为它本质上只需要更新本地阅读状态，不需要走完整 snapshot merge。

如果这里还留在 renderer：

- renderer 可以决定拉回后怎么改本地状态
- Tauri 只是代为请求和代为落地

那和前一刀刚收掉的 trust-boundary 问题是同一个类别。

现在这条链路已经回到更合理的边界：

- Tauri 拉远端
- Tauri 匹配本地书
- Tauri 决定是否覆盖
- renderer 只展示结果

## 验证

- `cargo test --manifest-path /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src-tauri/Cargo.toml koreader_remote_sync`（PASS）
- `pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec check`（PASS）
- `git -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec diff --check`（PASS）

## 没有包含

- 没有把 `KOReader exchange import` 的 merge/apply 搬进 Rust；那条还在下一刀
- 没有让官方 KOSync 支持 notes / bookmarks；它依然只是 progress-only
