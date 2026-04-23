# 0479 - 把 library surface input threading 收到 shared projection 后面

上一刀虽然已经把 page projection 主链收进了 `buildLibraryPageProjectionState(...)`，但 `+page.svelte` 里还留着另一大坨机械装配：

- 把一堆 browse/filter/projection 结果重新摊平成 `buildLibraryPageSurfaceSetFromState(...)` 的参数
- 再把 desktop coordinator 和 page action 上的回调一条条塞进去

这说明 route 虽然不再负责“怎么推导 page projection”，但仍然负责“怎么把 projection 重新翻译成 surface 输入”。

## 这刀做了什么

1. 扩展 [`src/lib/library/page.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/page.ts)

   新增：

   - `LibraryPageSurfaceProjectionState`
   - `buildLibraryPageSurfaceProjectionState(...)`

   它把当前 page projection、filter controls、view/sort、notice、migration、bulk-repair 这些 surface 关心的状态，统一翻译成一个 shared surface-facing projection。

2. 扩展 [`src/lib/library/surface.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/surface.ts)

   新增：

   - `buildLibraryPageSurfaceSetFromProjectionState(...)`

   这个 helper 现在接受：

   - `projectionState`
   - `actions`

   然后在 surface 层内部再把它们接回原来的 `buildLibraryPageSurfaceSetFromState(...)`。

   这样 route 不再持有那条长参数 threading。

3. 继续收薄 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)

   route 现在只做三步：

   - 产出 shared `currentLibraryPageProjectionState`
   - 产出 shared `activeLibraryPageSurfaceProjectionState`
   - 把 projection 和 action bindings 交给 `buildLibraryPageSurfaceSetFromProjectionState(...)`

   也就是说 route 不再自己做 surface-input object assembly，只保留 live state、controller/env wiring 和最后的 host render。

## 为什么这刀重要

这一刀收掉的是 route 里最后一块明显的“大对象参数翻译器”职责。

在此之前：

- `page.ts` 知道 page projection
- `surface.ts` 知道 surface model
- 但 route 还知道两者之间完整的 threading 细节

现在这条中间翻译层也进了 shared module，`+page.svelte` 离“只做 page host”又近了一步。

## 这刀刻意没做的事

- `buildLibraryPageSurfaceSetFromState(...)` 本身的行为没有改，只是把它前面的输入 threading 收到了 shared projection 后面
- URL browse-state parse、filter normalization、mount/runtime lifecycle 仍然留在 route host，这些还是 page-level boundary，而不是 surface projection 的职责

## 验证

- `pnpm check`
- `git diff --check`

## 结果

现在 route 里已经不再保留那段 `buildLibraryPageSurfaceSetFromState(...)` 的长参数块。

后续如果继续 route-closure push，焦点就不该再是 surface input threading，而是 route 自身剩下的 live state / URL intake / normalization / lifecycle 这几块真正 host 级职责还要不要再继续收口。
