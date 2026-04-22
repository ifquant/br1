# 0435 - 把 library browse body builder 从 route 里抽出去

上一刀已经把 `LibraryBrowseBody` 改成直接吃 `LibraryBrowseBodyModel`。

但 `+page.svelte` 里仍然保留着两大块 reactive builder：

- `desktopBrowseBodyModel = { ... }`
- `starterBrowseBodyModel = { ... }`

它们虽然不再是模板 prop 矩阵，但本质上仍然把 body-level composition 压在 route 里。也就是说，route 还是在亲自写：

- recovery shelf copy
- continue/recent shelf copy
- desktop 初始空书库 copy
- search/filter miss empty state copy
- filter recovery chips/actions

这会让 `LibraryBrowseBodyModel` 变成“只是把 route 里的长对象包起来”，而不是把 body 语义真正收出去。

## 这刀做了什么

1. 新增 [`src/lib/library/body.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/body.ts)

   这个模块现在承接 body-level 构建职责：

   - `buildLibraryFilterEmptyState(...)`
   - `buildDesktopLibraryBrowseBodyModel(...)`
   - `buildStarterLibraryBrowseBodyModel(...)`

   它把下面这类 body composition 收成了共享逻辑：

   - desktop recovery shelf
   - desktop continue/recent shelf
   - desktop 初始空书库
   - desktop 搜索无结果 / 筛选无结果
   - starter continue/recent shelf
   - starter 搜索无结果 / 筛选无结果
   - filter recovery chips + clear action

2. [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)

   - 不再内联 desktop/starter 两套 body-model 对象
   - 改成调用 shared builders：
     - `buildDesktopLibraryBrowseBodyModel(...)`
     - `buildStarterLibraryBrowseBodyModel(...)`

   这样 route 现在只提供：

   - 当前过滤后的书单
   - 当前 notice / count / busy state
   - 当前 filter detail / chips
   - 真实 callback

   而不再自己决定 body-level copy 和 recovery section 怎么拼。

## 为什么这刀算大粒度对齐

这刀的重点是职责边界，不是“把代码搬个文件”。

前几刀已经把：

- grouped browse navigation
- grouped browse panel
- body shell
- empty state component
- body model

逐层从 route 抽出去。

如果 body model 的构建还一直写在 route 里，那么 route 仍然在定义 library body 的产品语义。现在把它放到 `library/body.ts` 之后，route 更接近：

- 读当前页面状态
- 交给 shared builder 产出 body model
- 交给 shared shell 渲染

这比继续在 `+page.svelte` 里堆 reactive object 更接近真正的 page presenter。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做的

- `body.ts` 目前还是带很多 route 回调参数，距离更纯的 presenter/input contract 还有一步
- `+page.svelte` 仍然保留大量 page-level derived state，例如 filter summary、header summary、scroll context 和 library notice 处理
- grouped browse 的更高层 page model 还没有完全收成 shared route presenter
