# 0448 - 把 desktop library record-domain helper 抽出去

上一刀已经把 desktop ingress workflow 从 route 下沉到了 `library/desktopIngress.ts`。

但 `+page.svelte` 里还留着一组不小、又很偏 domain 的桌面书库 helper：

- persisted record 和当前 shelf book 的匹配
- broken / bulk-repair / manual-repair 的分类
- recovery queue 的 persisted-record 选择
- manual relink review 的冲突文案和修复契约

这些逻辑已经不是页面模板，也不是 runtime wiring，而是 desktop library record-domain 规则。继续留在 route 里，会让 `+page.svelte` 依旧自己定义：

- 哪条 persisted record 对应当前书
- 哪些记录算破损，哪些可以批量修
- recovery queue 该取哪几条记录
- 手动重关联前应当给出什么级别的冲突提醒

## 这刀做了什么

1. 新增 [`src/lib/library/desktopRecords.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/desktopRecords.ts)

   这个新模块现在承接 desktop record-domain helper：

   - `lookupPersistedRecordForBook(...)`
   - `isPersistedRecordBroken(...)`
   - `isPersistedRecordBulkRepairEligible(...)`
   - `isPersistedRecordManualRepairOnly(...)`
   - `getRecoveryQueuePersistedRecords(...)`
   - `buildManualRelinkReview(...)`

   也就是说，persisted-record 匹配、修复分类、修复队列和手动重关联预检文案，已经开始有独立模块边界。

2. 继续收薄 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)

   route 现在不再内联：

   - persisted record lookup key 和 match key 生成
   - broken / bulk-repair / manual-repair 三种分类规则
   - recovery queue 的 persisted-record 过滤
   - manual relink review 的冲突检测和提示文案生成

   route 现在只是把：

   - 当前 `book`
   - 当前 `persistedLibraryRecords`
   - `sortRecordsForLibraryShelf(...)`

   这些页面侧输入交给 shared helper，再把结果接回 repair queue UI 和 maintenance workflow。

## 为什么这刀重要

到这一刀为止，`+page.svelte` 里最重的 desktop flow 和 desktop record-domain helper 都已经不再 inline：

- `desktopMaintenance.ts`
- `desktopIngress.ts`
- `desktopRecords.ts`

这意味着 library route 继续收口时，重心已经更明确了：

- page state
- runtime host
- environment boundary
- controller wiring

而不是继续把 desktop 书库业务规则、修复判定和冲突文案直接写在 route 里。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做的

- route 仍然保留 page-level runtime host、scroll context、以及 open-source-path 这类环境侧行为
- 还没有更高一层统一的 library page controller 对象把 runtime、controller、desktop workflow 再进一步收拢
