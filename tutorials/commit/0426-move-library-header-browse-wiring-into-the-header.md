# 0426 - 把 library header 的 grouped-browse wiring 也收进 header

## 背景

前两刀已经把 grouped browse 往共享浏览单元推进了两层：

- 主内容区抽成 shared panel
- panel 自己开始消费 `browseState + dispatch action`

但 `+page.svelte` 里还剩一块单独的 grouped-browse controller，不在 panel，而在 header：

- breadcrumb trail availability
- breadcrumb reason labels
- `返回整库 / 返回上一级` 可用性
- active-group guard explanations
- active-group description

这些都还需要 route 自己算完，再一股脑传给 [`LibraryHeader.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryHeader.svelte)。

这会让 grouped browse 仍然裂成两套 controller：

- panel 一套
- header 一套

## 这次做了什么

这次把 header 这层 grouped-browse wiring 也并进了 header 自己：

1. [`src/lib/components/library/LibraryHeader.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryHeader.svelte)
   - 新增 `browseState`
   - 新增 `activeGroupVisibleCount`
   - 新增 `onDispatchBrowseAction`
   - 组件内部直接基于 shared navigation helpers 派生：
     - trail availability
     - trail reason labels
     - exit availability
     - exit reason label
     - active-group guard explanations
     - active-group description
   - `返回整库 / 返回上一级` 与 breadcrumb 点击也优先直接 dispatch browse action
2. [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)
   - 删除 header 专用的 grouped-browse availability/reason/description wiring
   - 改成只传：
     - `browseState`
     - `activeGroupVisibleCount`
     - `dispatchLibraryBrowseAction`

## 为什么这一步重要

### 1. 这让 grouped browse 的 controller 不再裂在 header 和 panel 两头

如果 panel 已经开始自己消费 browse state，但 header 还得 route 先算好一整套 breadcrumb/exit wiring，再传进去，那么 grouped browse 仍然不是一个统一的浏览系统。

这一刀之后，header 和 panel 都开始站在同一层 shared browse state 上工作。

### 2. route 更接近真正的 browse-page shell

现在 route 对 grouped browse 又少管了一层：

- 不再手写 header-level guard 和 reason wiring
- 不再给 header 传一套专属的 breadcrumb controller props

它更接近：

- 保存 state
- 统一 dispatch
- 组装外层 library page

### 3. 后面继续往 browse controller/model 收时边界更清楚

现在 grouped browse 的两大主要 UI surface：

- header
- panel

都已经在直接消费 shared browse state 和 action dispatch。

这意味着下一步如果继续大粒度对齐，就可以开始考虑更高层的 browse shell/controller，而不是再回头清理零散的 header wiring。

## 结果

现在 `br1` 的 grouped browse 已经从：

- shared navigation model
- shared surface model
- shared panel wiring

继续推进到：

- shared header wiring

也就是说，route 上残留的 grouped-browse controller 进一步缩小，header 不再是另外一套单独手喂的浏览面。

## 验证

- `pnpm check`（PASS）
- `git diff --check`（PASS）

## 未覆盖项

- `LibraryHeader` 仍然保留了 `exitgroup` / `jumptrail` 事件兼容路径，没有完全删掉旧事件接口
- route 仍然直接持有 `dispatchLibraryBrowseAction(...)`，还没有继续抽成更完整的 grouped-browse shell/controller
- desktop/starter 在 browse 之外的 workflow shelf、notice、empty-state 这些 library page 外层结构上仍然分叉
