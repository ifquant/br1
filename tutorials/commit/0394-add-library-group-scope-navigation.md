# 0394 - 让书库分组从“展示”变成“可进入的浏览路径”

## 背景

上一刀已经给 `br1` 的 library 补了 `group by`：

- 按作者
- 按归类
- 按格式

但那一层还停在“展示分组”。

也就是说，页面已经知道怎么把书分段显示出来，却还没有让用户真正“进入某一组继续浏览”。这和 `readest` 的浏览心智仍然有差距，因为真正的大粒度对齐，不只是看到分组标题，而是要能顺着这个结构往里走，再顺着路径退回来。

## 这次要补什么

这次不再继续加筛选项，也不再微调卡片，而是把分组书架补成一条浅层浏览路径：

1. 用户可以从某个分组 section 进入该组
2. 进入后，主书架只显示这一组的书
3. 页面顶部会出现一条 breadcrumb 式返回路径
4. 用户可以通过 `返回整库` 退回整个书架

这不是完整的多级目录系统，但它已经把 library 从“分组展示”推进到了“分组浏览”。

## 改动概览

- 在 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte) 新增 `libraryGroupScope`
- 让 library 的书架过滤逻辑在 `status / format / collection / tag` 之外，再叠一层当前 group scope
- 在 scroll context key 里加入 group scope，避免分组切换后和其他浏览状态串滚动位置
- 在 [`src/lib/components/library/BookshelfPreview.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/BookshelfPreview.svelte) 给每个 group section 加 `进入`
- 在同一个组件里加入 breadcrumb 式 `返回整库 / 当前分组`

## 为什么这一步重要

### 1. 分组展示和分组导航是两回事

只把书“显示成几段”，用户看到的仍然是一个大书架。

只有当用户能：

- 进入某一组
- 在这一组里继续看书
- 再退回全局

这个分组才真正变成浏览结构，而不是视觉装饰。

这也是很多 library 页面容易停住的地方：做了 group header，以为已经有了 browse model，实际上还没有。

### 2. 浅 drill-down 比直接上多级结构更稳

这次没有直接做复杂的分层 route、专门的 group detail page 或多级 breadcrumb。

而是先做一层很窄、但产品意义已经成立的版本：

- 当前页内进入一组
- 当前页内退出一组

这样做的好处是：

- 不会打断现在 library 的整页结构
- 不需要额外复制一套 group detail 页面
- 能先验证这条 browse 心智是否真适合 `br1`

对现有产品做大粒度升级时，这种“先把心智做对，再决定要不要加更重的结构”的顺序通常更稳。

### 3. group scope 也应该算浏览上下文

如果页面把筛选、排序、view mode 都当成 browse context，却不把当前 group scope 算进去，滚动恢复就会出现错位：

- 用户刚刚在某个作者组里
- 切回整库或切换其他 group
- scroll restore 却还停在旧上下文的位置

所以这次把 `libraryGroupScope` 一起接进了 scroll context key。

这类状态看起来像小事，但它决定了“能不能把浏览结构当成真的导航状态来处理”。

## 结果

现在 `br1` 的 library 已经不只是：

- 能筛选
- 能排序
- 能分组显示

而是进一步变成：

- 能按组浏览
- 能进入单组
- 能退回整库

这比单纯继续补卡片细节，更接近 `readest` 那种“书库是一个可浏览空间”的页面心智。

## 验证

- `pnpm check`（PASS）
- `git diff --check`（PASS）

## 未覆盖项

- 这次还没有做多级 breadcrumb 或单独的 group detail route
- 这次没有补专门的 library grouped-navigation e2e
- 这次没有继续扩展 collections/tags 的专门管理面板
