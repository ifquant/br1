# 0440 - 把 library surface lifecycle runtime 抽出去

上一刀已经把 library page 里的 runtime helper 抽成了 shared `library/runtime.ts`：

- browse href sync
- scroll context key
- scroll position save/restore

但 `+page.svelte` 里还剩一整块 mount-time lifecycle wiring：

- 首次 refresh
- `beforeunload`
- `focus`
- `visibilitychange`
- viewport scroll listener 的 attach/retry
- Tauri `LIBRARY_SURFACE_RELOAD_EVENT` listener

这些逻辑仍然属于页面运行时基础设施，不属于书库产品行为本身。继续留在 route 里，会让 `+page.svelte` 既管业务，又管窗口/文档/viewport 生命周期。

## 这刀做了什么

1. 扩展 [`src/lib/library/runtime.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/runtime.ts)

   新增了 `installLibrarySurfaceRuntime(...)`，统一承接 library surface 的生命周期 wiring：

   - 初始 refresh
   - `beforeunload` 时保存 scroll 位置
   - `focus` / `visibilitychange` 时 refresh
   - viewport scroll listener 的安装和短暂重试
   - Tauri reload event listener 的挂载与清理

   这样 library page 不再自己实现这一整套 mount/unmount plumbing。

2. 收薄 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)

   route 现在在 `onMount(...)` 里只负责把当前页面依赖交给 shared runtime：

   - `window`
   - `document`
   - viewport getter
   - refresh callback
   - scroll save callback
   - 当前 scroll context key

   也就是说，route 还保留页面状态和行为，但不再内联实现那批 surface lifecycle 基础设施。

## 为什么这刀重要

这刀继续把 library page 从“知道一切的超大 route”往“状态装配 + 行为 callback”方向收。

到这里，`library/runtime.ts` 已经不只接管：

- browse URL sync
- scroll persistence

还进一步接管了：

- surface mount lifecycle
- window/document refresh hooks
- viewport scroll binding
- Tauri reload wiring

这能让后续如果还有 desktop/starter 共用的 surface runtime 调整，优先在 shared runtime 层发生，而不是继续把 `+page.svelte` 撑回去。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做的

- notice state、repair/remove/update、metadata 编辑这些页面动作仍然留在 route
- persisted-record lookup 和更高层的 desktop library workflow 还没有进一步抽成 shared controller/use-case
