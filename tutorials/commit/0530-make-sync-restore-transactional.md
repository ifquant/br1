# 0530 - 把 snapshot restore 收口成事务式恢复

这刀不是加新功能，而是把 `sync snapshot restore` 主链补到和最近几刀同样严的正确性边界。

`0529` 已经做了两件事：

- `Readest Cloud pull` 不再只做弱 JSON 校验，而是先走 restore-level 结构校验
- KOReader exchange import 的 apply 已经有自己的 rollback-backed 写入

但共享的 snapshot restore 主链还留着一个老问题：本地 restore 和 `readestCloud pull` 最终都要落到 `apply_sync_snapshot_roots(...)`，而这个函数之前还是“先清目录、再逐个写文件”的顺序写法。

一旦中途某个文件写失败，就会出现：

- `library.json` 已改
- 部分 bookmarks / notes / highlights 已改
- 另一部分没改

这对 sync restore 来说是不合格的，因为恢复结果会停在半成功状态。

相关文件：

- [`src-tauri/src/commands/sync_snapshot.rs`](/Users/dev/workspace2/hc_apps/br1/src-tauri/src/commands/sync_snapshot.rs)
- [`src-tauri/src/commands/remote_sync.rs`](/Users/dev/workspace2/hc_apps/br1/src-tauri/src/commands/remote_sync.rs)
- [`src/lib/library/desktopPage.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/desktopPage.ts)

## 这刀做了什么

1. 把共享 snapshot apply roots 改成 mutation-plan + rollback

   `apply_sync_snapshot_roots(...)` 不再直接：

   - 清空 bookmarks 目录
   - 写 bookmarks
   - 清空 notes 目录
   - 写 notes
   - 清空 highlights 目录
   - 写 highlights

   现在它会先构建完整 mutation plan：

   - 哪些文件要写
   - 哪些旧 json 文件要删
   - `library.json` 最终要写成什么

   然后通过统一的 rollback-backed helper 一次执行。

2. 删除操作也进入回滚模型

   事务式恢复不只是“写失败能回滚新内容”，还要覆盖“先删掉旧文件，后面失败了怎么办”。

   这次新增的 mutation helper 会先备份每个目标路径的原内容，然后再执行：

   - `Write`
   - `Delete`

   任一 mutation 失败时：

   - 原来存在的文件恢复原字节
   - 原来不存在、但本次新建的文件会被删掉

   这样 bookmarks / notes / highlights 这些按目录同步的状态，才不会因为中途失败而留下“旧文件已删，新文件没写完”的坑。

3. `Readest Cloud pull` 继续绑定在 restore-level 校验上

   这刀没有再放松 `remote_sync` 的边界。

   相反，它保持：

   - 远端 snapshot 必须先通过 restore-level 校验
   - 然后才进入共享的事务式 apply 路径

   这样 `local restore` 和 `remote pull` 两条入口，终于共享了同一套“可接受 + 可落地”的标准。

## 为什么这刀重要

如果没有这层事务式恢复，主干上的 sync 仍然有一个明显 correctness 漏洞：

- 输入是可信的
- 校验是通过的
- 但本地持久化失败时，状态仍然可能只写了一半

这类问题最麻烦，因为它不是“直接报错不工作”，而是“报错之后本地状态已经脏了”。

对 sync restore 来说，正确语义必须是：

- 要么整套恢复完成
- 要么本地状态维持原样

## 测试怎么补

这刀新增和保留的重点测试是两类：

1. `sync_snapshot` 回归

   现在会直接验证：

   - 共享 snapshot apply 仍然能替换目标 state roots
   - rollback helper 在删除和写入混合失败时，能把旧文件恢复回来

2. `remote_sync` 回归

   继续确保：

   - `pull` 仍然走 restore-level 校验
   - provider 错误状态没有因为事务式恢复改造而退化

## 验证

- `cargo test --manifest-path /Users/dev/workspace2/hc_apps/br1/src-tauri/Cargo.toml sync_snapshot`（PASS）
- `cargo test --manifest-path /Users/dev/workspace2/hc_apps/br1/src-tauri/Cargo.toml remote_sync`（PASS）
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`（PASS）
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`（PASS）

## 没有包含

- 没有新增新的 sync provider、冲突解决 UI、历史快照管理
- 没有把整个 app 的所有持久化写入都抽象成统一事务层；这刀只收 snapshot restore 主链
