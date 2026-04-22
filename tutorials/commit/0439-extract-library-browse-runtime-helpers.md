# 0439 - 把 library browse runtime helper 抽出去

前几刀已经把 library page 的三层静态/派生装配拆出来了：

- `library/page.ts`
- `library/body.ts`
- `library/chrome.ts`

但 `+page.svelte` 里还留着一块 runtime plumbing：

- browse URL sync
- scroll context key 生成
- scroll position 的 sessionStorage 持久化与恢复

这些逻辑不属于产品行为本身，但一直和页面行为、事件处理、notice、repair 流程挤在一起，让 route 继续承担太多“页面运行时基础设施”。

## 这刀做了什么

1. 新增 [`src/lib/library/runtime.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/runtime.ts)

   这个模块现在承接 shared runtime helper：

   - `syncLibraryBrowseLocation(...)`
   - `buildLibraryScrollContextKey(...)`
   - `saveLibraryScrollPosition(...)`
   - `restoreLibraryScrollPosition(...)`

   这样 library page 的 browse href 拼装和 scroll persistence 不再只有 route 知道怎么做。

2. [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)

   route 现在仍然保留事件和生命周期控制，但 helper 实现已经改成委托给 shared runtime：

   - `syncLibraryBrowseLocation(...)` 内部改成调用 shared runtime helper
   - `buildLibraryScrollContextKey()` 改成只把当前状态交给 shared builder
   - scroll save/restore 也改成调用 shared persistence helper

## 为什么这刀重要

这刀收掉的不是一个 UI surface，而是 library page 最后那批明显偏“运行时基础设施”的局部实现。

到这一步，library route 已经不只是在模板和派生上变薄，连下面这些 runtime plumbing 也开始共享：

- browse state 跳转
- scroll context key
- scroll persistence

这能让 `+page.svelte` 更专注在：

- 当前页面状态
- 用户动作
- 桌面书库行为

而不是既要处理产品逻辑，又要亲自实现滚动恢复和 browse href plumbing。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做的

- onMount 里的 viewport listener、window/document 事件绑定和 Tauri reload listener 仍然留在 route
- notice state、本地 action handler、persisted-record lookup、repair/remove/update 等更强的页面运行时逻辑仍然没有抽出去
