# 0449 - 把 desktop library catalog projection 抽出去

上一刀已经把 desktop record-domain helper 从 route 下沉到了 `library/desktopRecords.ts`。

但 `+page.svelte` 里还留着另一簇很重的桌面书库逻辑：

- persisted record 的 shelf 排序
- Readest 兼容记录计数
- persisted record 到 `LibraryShelfBook` 的映射
- `lastOpened / importedAt / progressPercent` 文案
- availability / compatibility 这组展示标签

这些逻辑不是页面 runtime，也不是 controller wiring，而是 desktop library catalog projection。继续留在 route 里，会让 `+page.svelte` 还在亲自定义：

- 书库记录按什么顺序进入 shelf
- 一条 persisted record 怎么投影成 library shelf book
- 桌面书库条目的各种状态文案到底怎么生成

## 这刀做了什么

1. 新增 [`src/lib/library/desktopCatalog.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/desktopCatalog.ts)

   这个新模块现在承接 desktop catalog projection：

   - `sortRecordsForLibraryShelf(...)`
   - `formatLastOpenedLabel(...)`
   - `formatImportedAtLabel(...)`
   - `formatProgressPercentLabel(...)`
   - `mapDesktopLibraryRecord(...)`
   - `countReadestCompatibleRecords(...)`
   - `buildDesktopCatalogProjection(...)`

   也就是说，桌面 persisted record 的排序、投影和展示标签，已经开始有独立模块边界。

2. 继续收薄 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)

   route 现在不再内联：

   - reader validation rank 和 shelf 排序规则
   - 最后阅读时间 / 导入时间 / 进度百分比格式化
   - availability / compatibility / source label 生成
   - persisted record 到 `LibraryShelfBook` 的完整投影
   - Readest-compatible 记录计数

   route 现在只是把 persisted records 交给 shared catalog builder，再接回：

   - `readestCompatibleCount`
   - `importedBooks`

## 为什么这刀重要

到这一刀为止，`+page.svelte` 里和 desktop persisted records 直接耦合的两层都已经不再 inline：

- `desktopRecords.ts` 负责 record-domain 和 repair-domain
- `desktopCatalog.ts` 负责 record projection 和 presentation labels

这让 library route 更明确地往 host/controller 角色收缩：

- page state
- runtime wiring
- environment boundary
- UI action dispatch

而不是继续自己定义 desktop 书库条目长什么样、怎么排、怎么算兼容和可修复状态。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做的

- route 仍然保留 page-level runtime host、scroll context、以及一批 controller/action wiring
- desktop/starter 两侧 page-surface 的装配虽然已经共享很多，但还没有统一到更高一层 page controller / coordinator
