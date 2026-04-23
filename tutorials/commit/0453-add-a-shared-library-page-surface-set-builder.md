# 0453 - 给 library page surface 加 shared surface-set builder

前几刀已经把 library page 的很多边界抽到了 shared layer：

- host / surface shell
- chrome model
- body model
- page action model
- desktop page coordinator

但 `+page.svelte` 里还留着一块很厚的模板外负担：

- 手工拼 desktop page surface
- 手工拼 starter page surface
- 再手工根据 `desktopLibraryMode` 选 active surface

这意味着 surface 的子层虽然都已经 shared 了，但 route 仍然在自己做顶层 page-surface assembly。

## 这刀做了什么

1. 扩展 [`src/lib/library/surface.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/surface.ts)

   新增：

   - `buildLibraryPageSurfaceSet(...)`

   这个 shared builder 统一负责：

   - 基于同一份 chrome state 构建 desktop/starter 两个 page surface
   - 返回 `desktop / starter / active`
   - 把 `desktopLibraryMode` 下的 active-surface 选择也收进去

2. 继续收薄 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)

   route 现在不再自己维护：

   - 一整套 `buildDesktopLibraryPageSurfaceModel({...})`
   - 一整套 `buildStarterLibraryPageSurfaceModel({...})`
   - 再单独写一条 `desktop ? desktopSurface : starterSurface`

   route 现在只把：

   - shared chrome state
   - desktop body state
   - starter body state
   - `desktopLibraryMode`

   交给 `buildLibraryPageSurfaceSet(...)`，再消费它返回的三个 surface。

## 为什么这刀重要

这一刀的价值在于，它终于把 route 里最大块的 reactive object-literal assembly 收到了 shared layer。

到这里，surface 这一层的抽象开始完整起来：

- 子模型已经 shared
- shell 组件已经 shared
- 顶层 surface-set assembly 也开始 shared

这让 `+page.svelte` 更接近“提供 state 和 environment，然后消费 shared builders”的角色，而不是继续亲自拼一大坨 desktop/starter surface payload。

## 验证

- `pnpm check`
- `git diff --check`

## 还没做的

- route 仍然保留 filter-control、browse state、scroll/runtime context 以及大量 reactive state derivation
- library page 还没有更高一层统一 page-state builder，把当前这组 reactive browse/filter/surface derivation 再继续上提
