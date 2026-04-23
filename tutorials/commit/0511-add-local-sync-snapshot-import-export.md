# 0511: 在现有 library header 上补齐本地 sync snapshot 导入导出

这次完成的是 P2-3.2 的第一条真正可用产品路径：在远端 provider 还不存在之前，用户已经可以把本机的书库同步状态导出成一个版本化快照文件，也可以再从这个快照恢复回来。

重点不是“又加一个文件读写按钮”，而是两件事要同时成立：

- 用户真的能从现有 app surface 触达这个流程
- renderer 不能靠传任意路径把 Tauri 变成通用本地文件读写器

所以这次没有新建“Sync 页面”，而是把入口挂到现有 library header 的“更多操作”菜单里；同时所有 snapshot 文件路径都继续由 Tauri 侧 dialog 决定。

## 这次改了什么

- `src-tauri/src/commands/sync_snapshot.rs`
  - 新增本地快照命令模块。
  - `save_sync_snapshot_dialog`
    - 接收已经组装好的 snapshot document。
    - 用 Tauri dialog 打开保存对话框。
    - 默认保存到 app data 下的 `sync-snapshots/` 建议目录。
    - 写入前会校验 schema version、record id 唯一性和基础记录完整性。
  - `load_sync_snapshot_dialog`
    - 用 Tauri dialog 打开快照文件选择器。
    - 读取 JSON 后做同样的 schema/record 基础校验。
    - 返回的是解析后的 snapshot 内容和安全摘要，而不是把文件路径暴露给 renderer。
  - `apply_sync_snapshot`
    - 把恢复动作集中在 Tauri 侧执行。
    - 覆盖写入：
      - `library.json`
      - reader bookmarks root
      - reader notes root
      - highlights workspace root
    - 旧的同类 `.json` 状态文件会先清掉，避免“恢复后还有残留旧状态”。

- `src-tauri/src/models.rs`
  - 补齐 snapshot 相关 request/response model。
  - 顺手修正了这条 snapshot 路径依赖的持久化形状缺口：
    - bookmark 现在保留 `targetHref`
    - highlights workspace 现在保留 `savedSelectionsRefreshFilter`
    - saved selection 现在保留 `importSource`

- `src/lib/services/syncSnapshot.ts`
  - 新增 renderer 侧 facade。
  - `createLocalSyncSnapshot`
    - 从当前书库记录、bookmarks、notes、highlights workspace、reader settings 组装出真正的 `Br1SyncSnapshot`。
  - `prepareSyncSnapshotRestore`
    - 解析导入结果并恢复成当前 app 认识的持久化形状。
    - 如果 snapshot 里只有 reading-state 却缺少对应 library metadata，会明确报错，而不是悄悄吞掉。
  - `persistImportedReaderSettings`
    - reader settings 仍然回写到当前本地 storage，但路径来源不交给 renderer。

- `src/lib/library/desktopPage.ts`
  - 把导出/导入流程接进现有 desktop library coordinator。
  - 导出时会收集：
    - persisted library books
    - 每本书的 bookmarks
    - 每本书的 notes
    - 每本书的 highlights workspace
    - 当前 reader settings
  - 导入时会：
    - 先让 Tauri 负责选文件和解析
    - 再把恢复后的业务形状交给 Tauri apply
    - 最后刷新 library surface，并把 reader settings 写回当前 storage
  - 成功、取消、失败都走现有 notice surface，保持产品内反馈一致。

- `src/lib/components/library/LibraryHeader.svelte`
  - 在“更多操作”菜单中新增：
    - `导出本地快照`
    - `恢复本地快照`
  - 不新增独立页面，符合这次 slice 的最小可见入口要求。

- `src/routes/library/+page.svelte`
  - 把 snapshot busy state 和相关 service/env 绑定接入 library page。

- `.planning/READEST-ALIGNMENT-CHECKLIST.md`
  - P2-3.2 标记完成。
  - S-2 只就 snapshot 这条文件边界做了精确说明，不把不相关服务边界一并夸大。

## 为什么 apply 要放在 Tauri，不在 renderer 里逐项写

如果 renderer 自己拿到 snapshot 后，再自己传一堆“目标路径”给 Tauri 去写，那实际上只是把危险路径拼装工作转移了一层。

这次更稳的做法是：

- renderer 只处理业务记录和产品状态
- 文件选择 / 文件保存路径由 Tauri dialog 决定
- 真正落盘到哪些 app-data 位置，也由 Tauri 自己根据既有 root 规则决定

这样 snapshot flow 仍然是“面向产品状态”的，而不是“面向任意文件路径”的。

## 恢复语义这次为什么选择覆盖

本地 snapshot import/export 的目标是“给用户一个明确可回滚的本机状态切片”，不是做模糊合并。

所以这次恢复语义是：

- library records: 覆盖当前 `library.json`
- bookmarks / notes / highlights workspace: 清理旧状态后按 snapshot 重建
- reader settings: 直接恢复为 snapshot 里的版本

这样用户才会得到一个更接近“把当时状态恢复回来”的结果，而不是“旧状态和新状态混杂”。

真正的冲突解决和更细的 merge 语义，留给后面的远端 provider / conflict flow。

## 这次没有做什么

- 还没有远端 sync provider
- 还没有 conflict resolution UI
- 还没有快照历史列表或自动命名管理页
- 还没有把 library 二进制书籍文件本身打包进 snapshot

这次恢复的是“当前持久化状态形状”，不是一份完整离线备份归档。

## 新手知识点

“安全的文件功能”不等于“完全不能读写文件”，而是要看谁拥有路径决定权。

一个常见误区是把安全边界理解成“既然要安全，那 renderer 就别碰任何文件功能”。这其实太粗暴，也会让产品不可用。更准确的边界是：

- 如果 renderer 可以随便传任意绝对路径给后端，那后端就容易退化成通用文件代理
- 如果路径来源是后端自己控制的 app-data root，或者是后端自己弹出的 picker/save dialog，那能力仍然可以开放，但信任边界还在

这次 snapshot flow 走的就是后者。
