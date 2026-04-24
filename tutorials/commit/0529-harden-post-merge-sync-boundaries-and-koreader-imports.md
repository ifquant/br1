# 0529 - 收紧 post-merge 的 sync 边界和 KOReader 导入语义

这刀是主干合并后的补救修正，不是新能力。

merge-review 之后又暴露出三类问题：

1. `KOReader exchange import` 的 apply 不是带回滚的，后半段写失败时可能留下部分已写状态
2. `local-newer` 判定只看 `created_at`，没有把 KOReader annotation metadata 里的 `updated_at` 算进去
3. `Readest Cloud pull` 和 `Readest import` 还有两个边界没收紧：
   - 远端 snapshot 校验还是太弱
   - `import_readest_library` 不应该把 Readest 的 location 直接塞进 `koreaderProgressLocation`

相关文件：

- [`src-tauri/src/commands/sync_snapshot.rs`](/Users/dev/workspace2/hc_apps/br1/src-tauri/src/commands/sync_snapshot.rs)
- [`src-tauri/src/commands/remote_sync.rs`](/Users/dev/workspace2/hc_apps/br1/src-tauri/src/commands/remote_sync.rs)
- [`src-tauri/src/commands/library.rs`](/Users/dev/workspace2/hc_apps/br1/src-tauri/src/commands/library.rs)
- [`src/lib/library/desktopPage.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/desktopPage.ts)

## 这刀做了什么

1. 给 KOReader exchange apply 增加了失败回滚

   `sync_snapshot.rs` 现在会先把所有目标文件内容准备好，再通过一个带 rollback 的批量写 helper 落盘：

   - bookmarks 文件
   - notes 文件
   - `library.json`

   如果中途任意一处写失败，之前已写的文件会恢复成原内容，而不是留下半套新状态。

2. `local-newer` 改成看真正的更新时间

   对 bookmarks / notes 来说，`created_at` 不够用，因为 KOReader metadata 里还会保存真正的 `updated_at`。

   现在本地新旧判断优先看：

   - bookmark `koreader.annotation.updated_at`
   - note `koreader.updated_at`

   只有没有这两个字段时才退回 `created_at`。

3. fallback 匹配必须通过 KOReader identity

   以前在 `bookId` / `filePath` / `sourcePath` 都对不上时，还会退回到：

   - `title + author + format`

   这在跨设备、重名书、不同版本同书时太危险。

   现在 fallback 还要额外通过 KOReader identity hash，才允许命中本地图书。

4. 远端 pull 改成 restore-level 校验

   `remote_sync.rs` 不再只做“record id 非空”这种弱校验，而是直接调用 snapshot restore 级别的结构校验。

   这样远端返回的 snapshot 必须满足“真的可恢复到本地”的约束，才会继续走 pull 成功路径。

5. 页面只对真正可重试的 Readest Cloud 失败给“重试”

   `desktopPage.ts` 现在看的是 `result.retryable`，而不是一律把 `retryable-failure` 当作可重试。

   这样错误配置、坏 payload、非重试型拒绝不会再被 UI 伪装成“再点一次试试”。

6. Readest import 不再伪造 KOReader provenance

   `library.rs` 现在保留：

   - `progressLocation = readest location`

   但不再把同一个值也写进：

   - `koreaderProgressLocation`

   这能避免刚从 Readest 导入的书，被错误当作已经拥有 KOReader sync 定位信息。

## 为什么这刀重要

这次不是“代码整洁度”问题，而是 merge 后主干上的状态正确性问题：

- 写入不能半成功
- 新旧判断不能忽略真正的更新时间
- 跨系统同步定位字段不能相互污染
- 远端 snapshot 不能只做表面 JSON 校验

如果不收这刀，主干虽然能跑，但在极端情况下会出现：

- 导入中途失败后本地状态半更新
- 旧 KOReader annotation 覆盖掉更新过的本地 annotation
- 不该匹配的同名书被 fallback 命中
- Readest 导入结果被误认为是 KOReader sync provenance

## 验证

- `cargo test --manifest-path /Users/dev/workspace2/hc_apps/br1/src-tauri/Cargo.toml sync_snapshot`（PASS）
- `cargo test --manifest-path /Users/dev/workspace2/hc_apps/br1/src-tauri/Cargo.toml remote_sync`（PASS）
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`（PASS）
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`（PASS）

## 没有包含

- 没有把 Readest Cloud push/pull 改成事务式多文件恢复；这刀只把远端 snapshot 校验前移
- 没有扩展任何新的 sync provider 或新的 KOReader 协议能力；这刀纯粹是 post-merge hardening
