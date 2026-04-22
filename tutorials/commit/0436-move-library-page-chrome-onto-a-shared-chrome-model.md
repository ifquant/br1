# 0436 - 把 library page chrome 也收成 shared chrome model

上一刀已经把 body-level builder 抽到了 `src/lib/library/body.ts`。

但 `+page.svelte` 里还保留着另一块很重的 wiring：

- `LibraryPageChrome`
- `LibraryHeader`
- library notice
- Readest migration banner

route 仍然要直接给 `LibraryPageChrome` 传几十个 props：

- header 统计和筛选状态
- grouped browse 当前路径
- filter chips / summaries
- notice
- migration banner 状态

这意味着 page-level chrome 语义虽然已经在组件里渲染，但其数据装配仍然深深留在 route 模板层。

## 这刀做了什么

1. [`src/lib/library/types.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/types.ts)

   新增一组 shared chrome types：

   - `LibraryActiveFilterChip`
   - `LibraryNoticeModel`
   - `LibraryHeaderModel`
   - `LibraryPageChromeModel`

   这样 header 和 page chrome 都有了明确的模型边界，不再只是一堆平铺 props。

2. 新增 [`src/lib/library/chrome.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/chrome.ts)

   - `buildLibraryPageChromeModel(...)`

   这个 builder 统一承接：

   - header 当前 browse/filter/sort/view state
   - status / format / collection / tag summaries
   - notice 展示数据
   - Readest migration banner 状态

3. [`src/lib/components/library/LibraryHeader.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryHeader.svelte)

   - 改成直接消费 `model: LibraryHeaderModel`
   - 组件内部再从 `model` 解包

   这样 header 的 API 从“二十多个 prop”变成“一个 header model + browse dispatch”。

4. [`src/lib/components/library/LibraryPageChrome.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryPageChrome.svelte)

   - 改成消费 `model: LibraryPageChromeModel`
   - 内部把 `model.header` 交给 `LibraryHeader`
   - notice 和 Readest banner 也直接从 `model` 取值

5. [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)

   - 新增 `libraryPageChromeModel`
   - 改成通过 `buildLibraryPageChromeModel(...)` 构建 chrome model
   - 模板里不再手工铺 header / notice / migration banner prop 矩阵

## 为什么这刀算大粒度对齐

因为它收掉的不是某个按钮或某个 banner，而是 library page 顶层 chrome 的整层数据装配。

到这一步，route 里已经有两块明确被抽走：

- body-level composition -> `library/body.ts`
- chrome-level composition -> `library/chrome.ts`

这会让 `+page.svelte` 更接近真正的 presenter：

- 管理当前页面状态
- 调 shared builders 产出 chrome/body models
- 把 models 交给 shared shell

而不是一边维护状态，一边在模板里继续手工把每个组件的 prop 矩阵铺开。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做的

- `buildLibraryPageChromeModel(...)` 目前仍然要吃很多 route 级原始状态，还没有进一步分解成更薄的 summary/filter presenter helpers
- route 里仍然保留大量 library action handler、notice state 管理、scroll context 和 persisted-record 派生逻辑
- library page 还没有形成一个更完整的 page presenter module，当前只是把 chrome 和 body 两大装配层先抽了出来
