# 0429 - 把 desktop/starter library body 收成 shared browse-body shell

## 背景

前几刀已经把 grouped browse 的核心控制面往共享组件里推进了不少：

- header wiring
- panel wiring
- panel surface building
- grouping mode action dispatch

但 `+page.svelte` 里还保留着两大块 library body 模板：

- desktop library body
- starter library body

它们虽然业务上不完全一样，但已经共享很多结构：

- workflow notice
- continue / recent reading shelves
- grouped browse panel
- empty state 插入位置

再继续把这些都留在 route 里，会让 library page 一直停留在“大壳层拼接器”的状态。

## 这次做了什么

这次新增了一个 shared body-level shell：

1. [`src/lib/components/library/LibraryBrowseBody.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryBrowseBody.svelte)
   - 统一承接：
     - workflow notice
     - recovery / continue / recent shelves
     - grouped browse panel
     - `beforePanel` / `afterPanel` slot
   - 用 slot 保留 desktop/starter 空状态在 panel 前后位置不同的事实
2. [`src/lib/components/index.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/index.ts)
   - 导出 `LibraryBrowseBody`
3. [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte)
   - desktop body 改成通过 `LibraryBrowseBody` 组装 recovery / continue / recent + panel，并把 empty states 放在 `afterPanel`
   - starter body 也改成通过 `LibraryBrowseBody` 组装 continue / recent + panel，并把 empty states 放在 `beforePanel`
   - 删除 route 里两大块重复的 body-level browse template

## 为什么这一步重要

### 1. route 开始从“页面大模板”退成真正的 page shell

之前 route 虽然已经不再手管 grouped-browse controller，但仍然直接维护：

- workflow notice section
- ContinueReadingShelf 序列
- panel 前后 empty-state 结构

这些仍然是页面主体的大块模板。

这一刀之后，这一层也开始进入组件边界。

### 2. desktop/starter 的差异开始被约束成“配置差异”，而不是“两套模板”

现在这两条线共享的不是一点 helper，而是共享同一个 body shell：

- 哪些 workflow shelves 存在
- 空状态插在哪里
- panel 接什么 books/callbacks

差异开始更像配置，而不是维护两份页面树。

### 3. 后面继续收 library page shell 会更顺

现在如果继续大粒度对齐，下一步可以更自然地考虑：

- migration / notice / empty-state 再往上整合
- starter/desktop 更完整的 page-shell 对齐

而不是继续先在人肉拼接的 route 模板里开刀。

## 结果

现在 `br1` 的 library page 共享边界又往上提了一层：

- shared header wiring
- shared grouped-browse panel
- shared body-level browse shell

这意味着 grouped browse 已经不只是组件内部共享，而是开始带动整个 library body composition 一起收口。

## 验证

- `pnpm check`（PASS）
- `git diff --check`（PASS）

## 未覆盖项

- desktop/starter 的 empty-state copy 仍然没有统一成一个 shared empty-state model，只是通过 slot 统一进了 shared body shell
- migration banner 和 library notice 仍然还留在 route，而没有并进更高层的 library page shell
- `LibraryHeader` 里的 legacy fallback events 仍然存在，没有在这刀里一起清掉
