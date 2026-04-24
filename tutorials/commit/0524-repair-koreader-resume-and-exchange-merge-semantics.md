# 0524 - 修正 KOReader 恢复位置与交换导入语义

这一刀修的是一组很具体的 KOReader 对齐问题：

- KOReader 拉回来的同步定位已经存在，但从 library 重新打开书时还是优先走旧的本地 `progressLocation`
- KOReader exchange 导入会整本替换 notes / bookmarks，直接丢掉 br1 本地专属记录
- 导入的 KOReader bookmark 没有可点击 target，出现在 sidebar 里却点不动

相关文件：

- [`src/lib/services/libraryPersistence.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/services/libraryPersistence.ts)
- [`src/lib/services/koreaderSync.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/services/koreaderSync.ts)
- [`src/lib/sync/koreader.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/sync/koreader.ts)
- [`src/lib/services/libraryPersistence.test.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/services/libraryPersistence.test.ts)
- [`src/lib/services/koreaderSync.test.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/services/koreaderSync.test.ts)
- [`src/lib/sync/koreader.test.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/sync/koreader.test.ts)

## 这刀做了什么

1. library reopen 优先选择真正可恢复的同步定位

   `libraryPersistence.ts` 现在会区分两类定位：

   - reader 自己能直接 reopen 的定位，比如 `epubcfi(...)`、`txt:...`
   - KOReader 专用但当前 reader 不能直接跳转的 XPointer

   如果 `koreaderProgressLocation` 是 reader 可直接恢复的定位，就优先用它。
   如果它只是 KOReader 专用 XPointer，就不再硬塞进 reopen URL，而是退回更新过的进度百分比，避免继续用过期的 `progressLocation`。

2. KOReader exchange 导入改成“按匹配项更新”，不是“整本覆盖”

   `koreaderSync.ts` 现在不会再因为导入了一份 KOReader exchange，就把当前书的整个 bookmarks / notes payload 整个替换掉。

   新逻辑是：

   - 已匹配到 KOReader metadata 的记录会被更新
   - 只存在于本地 br1 的 notes / highlights / bookmarks 会保留
   - 真正冲突时还是维持原来的 newer-state 保护

   这样 exchange 继续是互通工具，不会变成“导一次就把本地额外编辑洗掉”的 destructive import。

3. 导入的 KOReader bookmarks 现在是可点击的

   `sync/koreader.ts` 在把 KOReader bookmark 适配成 br1 bookmark 时，给 `targetHref` 和 `chapterHref` 都补上了可用定位。
   如果本地已经有同 id 的 bookmark 并且有更好的目标地址，合并逻辑会保留本地那份 click target。

## 为什么这刀重要

这不是小 UI polish，而是同步语义是否可信的问题。

如果同步后：

- 打开书还回到旧位置
- 导入 exchange 会偷偷丢掉本地记录
- bookmark 看得见却点不动

那用户看到的“KOReader 对齐”就是假的，数据面也不可靠。

这刀的目标就是把这些语义收实，而不是只让字段名看起来对齐。

## 验证

- `cd /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec && pnpm dlx tsx --test ./src/lib/services/libraryPersistence.test.ts ./src/lib/services/koreaderSync.test.ts ./src/lib/sync/koreader.test.ts`（PASS）
- `pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec check`（PASS）
- `git -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec diff --check`（PASS）

## 没有包含

- 没有扩展官方 KOSync 的协议能力；官方 remote 仍然只做 progress
- 没有把 KOReader XPointer 直接变成 reader 内部可导航的通用 target；这仍然依赖更完整的 reader-side locator 转换路径
