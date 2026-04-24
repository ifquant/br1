# 0528 - 把 KOReader exchange import 的 merge/apply 搬进 Tauri

`0527` 那刀只是把旧的 renderer 预合并接线删掉，并明确提示“现在只校验，不会改本地书库”。

这次才是真正把缺口补上：KOReader exchange import 不再把 parsed document 送回 renderer，也不再让页面自己做 merge/apply，而是整条恢复链路都在 Tauri 里完成。

相关文件：

- [`src-tauri/src/commands/sync_snapshot.rs`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src-tauri/src/commands/sync_snapshot.rs)
- [`src-tauri/src/models.rs`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src-tauri/src/models.rs)
- [`src-tauri/src/lib.rs`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src-tauri/src/lib.rs)
- [`src/lib/services/koreaderSync.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/services/koreaderSync.ts)
- [`src/lib/services/index.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/services/index.ts)
- [`src/lib/library/desktopPage.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/library/desktopPage.ts)
- [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/routes/library/+page.svelte)

## 这刀做了什么

1. 新增 `restore_koreader_sync_exchange_dialog`

   现在 KOReader exchange import 走的是 restore-style command：

   - Tauri 打开文件选择器
   - Tauri 读取并验证 exchange JSON
   - Tauri 在本地书库里匹配目标图书
   - Tauri 直接写回 `library.json`、bookmarks、notes
   - renderer 只拿回 `applyResult`

   这和本地 snapshot restore 的边界一致，不再让 renderer 碰导入文档正文。

2. 在 Rust 里复刻 exchange merge 语义

   `sync_snapshot.rs` 现在直接处理三类关键规则：

   - 匹配规则：先 `bookId`，再 `filePath`，再 `sourcePath`，最后才允许唯一的 `title + author + format`
   - 保留规则：本地 `br1-only` 的 notes / bookmarks 不会被 KOReader 导入整本覆盖掉
   - 保护规则：如果本地阅读状态更新更晚，就跳过导入并返回 `local-newer`

   这样恢复语义不再藏在 TS helper 里。

3. 彻底移除旧的 renderer import command surface

   `load_koreader_sync_exchange_dialog` 这条旧 invoke 面已经不再注册，也不再被前端使用。

   这点很重要，因为“前端不用了”不等于“trust boundary 收好了”。只要旧命令还暴露着，renderer 仍然能绕过新的高层 flow 直接拿到 parsed document。

4. 页面只展示 apply 摘要

   `desktopPage.ts` 现在只消费：

   - `appliedBookCount`
   - `skippedBookCount`
   - `conflicts`

   成功导入后会 reload library，再展示应用/跳过/冲突数量。

## 为什么这刀重要

之前这条链路的问题不是“导入功能暂时没做完”，而是 trust boundary 还停在中间态：

- 文件选择已经在 Tauri
- 但 merge/apply 语义还留在 renderer

这会让桌面端原生命令和前端状态组装混在一起，最后变成“文件由 Tauri 选，但本地真实状态仍由 renderer 定义”。

现在边界才算真的闭合：

- renderer 只能发起“导入 KOReader exchange”这个高层动作
- 本地真实状态的匹配、冲突判断、写回都由 Tauri 决定

## 当前限制

这刀只把 `KOReader exchange import` 的 merge/apply 收进了 Tauri。

没有动的部分：

- KOReader exchange export 还是 renderer 生成文档，再交给 Tauri 选保存路径
- TS 里的 `mergeKoReaderSyncExchangeIntoSnapshot(...)` 仍然保留作测试语义基准，但不再参与桌面导入链路

## 验证

- `cargo check --manifest-path /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src-tauri/Cargo.toml`（PASS）
- `cargo test --manifest-path /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src-tauri/Cargo.toml sync_snapshot`（PASS）
- `pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec check`（PASS）
- `git -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec diff --check`（PASS）

## 没有包含

- 没有把 KOReader exchange export 也搬进 Tauri；这刀只处理 import/apply
- 没有删掉 TS 里的 exchange merge helper；它现在主要是测试和语义对照用途
