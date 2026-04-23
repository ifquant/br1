# 0446 - 把 desktop library maintenance workflow 抽出去

前几刀已经把 library route 的模板、surface、page host、以及最机械的一层 controller mutation 收走了。

但 `+page.svelte` 里还剩下一整簇更重的 desktop library maintenance flow：

- 恢复已移除记录
- 从书库移除
- 更新元数据
- 单本修复
- 批量修复

这些逻辑虽然都是 controller 层，但它们本身已经是完整的桌面维护 workflow，而不是页面模板的一部分。继续堆在 route 里，会让 `+page.svelte` 仍然带着大量 service 调用、notice 分支、确认对话和 reload 细节。

## 这刀做了什么

1. 新增 [`src/lib/library/desktopMaintenance.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/desktopMaintenance.ts)

   这个新模块现在承接一整簇 desktop maintenance workflow：

   - `restoreRemovedLibraryRecord(...)`
   - `removeLibraryBookFromDesktop(...)`
   - `updateDesktopLibraryBookMetadata(...)`
   - `repairDesktopLibraryBook(...)`
   - `bulkRepairDesktopLibraryBooks(...)`

   它们统一承接的职责包括：

   - 调用桌面 service
   - 驱动 notice 结果
   - 组合 repair/reload 逻辑
   - 处理 confirm 分支和失败文案

2. 收薄 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)

   route 现在不再自己内联：

   - remove 的 undo/notice/reload 分支
   - metadata update 的字段校验后 service 提交流程
   - repair 的 preview / confirm / import / reload / notice 流程
   - bulk repair 的循环、统计、summary、manual-repair 剩余数量判断

   route 现在只负责：

   - 查当前 `PersistedLibraryBook`
   - 提供 `window.confirm(...)` 这种环境边界
   - 提供 notice / reload / summary setter callback
   - 调 shared maintenance workflow

## 为什么这刀重要

这刀和前几刀不同，它不只是再收模板或重复赋值，而是第一次把一整簇真正有分支的 desktop library flow 从 route 下沉成 shared workflow 模块。

这意味着 `+page.svelte` 现在更集中在：

- 当前页面状态
- 记录查找
- 环境边界
- runtime wiring

而那些更完整的桌面维护流程，已经开始有自己的共享模块边界。

从这里再往下推进，就可以继续考虑把剩余的 import / migration / open-source-path / desktop loading 等流转也往更完整的 page controller/use-case 层收，而不是还把所有 desktop 行为挤在 route 里。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做的

- desktop import / Readest migration / open-source-path / loadLibrary 等流程仍然在 route
- persisted-record lookup、broken/bulk-repair eligibility、manual-relink review 这组 domain helper 还没有进一步抽成 shared library maintenance/domain module
