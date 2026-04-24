# 0527 - 删掉过期的 KOReader renderer 预合并接线

前几刀已经把 KOReader remote sync 的请求形状收窄成了 Tauri-owned 合同：

- `push` / `pull` 只传 `operation`
- 具体的本地进度读取和远端回填落地都在 Tauri 里做

但页面和服务层还残留着旧时代的接线：

- 还在 coordinator contract 里传 `createKoReaderRemoteProgressEntriesFromSnapshot`
- 还在传 renderer 侧的 `mergeKoReaderSyncExchangeIntoSnapshot`
- 还在传 renderer 侧的 `mergeKoReaderRemoteProgressIntoSnapshot`

这些接线虽然不一定还被真正执行，但它们会误导后续维护者，以为 renderer 仍然应该负责 KOReader merge/apply。

相关文件：

- [`src/lib/library/desktopPage.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/library/desktopPage.ts)
- [`src/lib/services/koreaderSync.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/services/koreaderSync.ts)
- [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/routes/library/+page.svelte)

## 这刀做了什么

1. 把 `Br1KoReaderRemoteSyncRequest` 收紧到真实请求形状

   `koreaderSync.ts` 现在只保留：

   - `operation`

   不再让类型层继续暗示 renderer 还要传 `entries`。

2. 删掉 desktop coordinator 里过期的 KOReader 预合并 contract

   `desktopPage.ts` 不再要求外层注入：

   - `createKoReaderRemoteProgressEntriesFromSnapshot`
   - `mergeKoReaderSyncExchangeIntoSnapshot`
   - `mergeKoReaderRemoteProgressIntoSnapshot`

   这样 coordinator contract 和当前真实执行边界重新一致。

3. 把 KOReader exchange import 明确成“已验证文件，但暂不 apply”

   当前 `KOReader exchange merge/apply` 还没搬进 Tauri，所以这一刀不假装它还能在 renderer 里安全执行。

   页面现在只会：

   - 读取并验证 exchange 文件
   - 展示文件名和图书数量
   - 明确提示“当前不会改动本地书库”

## 为什么这刀重要

这种“残留 contract”很容易让后续实现重新滑回旧边界：

- 看见 `entries` 就继续在 renderer 组装本地状态
- 看见 `mergeIntoSnapshot` 就想当然地在 renderer 里做 merge/apply

删掉这些残留，比留下一个“暂时没用”的 helper 更安全，因为它能直接减少错误复用的机会。

## 验证

- `pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec check`（PASS）
- `cd /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec && pnpm dlx tsx --test ./src/lib/services/koreaderSync.test.ts`（PASS）
- `git -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec diff --check`（PASS）

## 没有包含

- 没有把 KOReader exchange merge/apply 搬进 Rust；这仍然是下一刀
- 没有新增任何 KOReader 协议能力；这刀只是 contract 清理
