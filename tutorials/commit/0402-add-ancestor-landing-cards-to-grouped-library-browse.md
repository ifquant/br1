# 0402 - 给 grouped library browse 补 ancestor landing cards

## 背景

上一刀已经让 grouped browse 有了 breadcrumb trail：

- header 知道你从哪一层来
- 可以返回上一级
- 也可以点回某个祖先层

但这个路径信息还只存在于 header。  
也就是说，用户虽然“可以知道自己怎么来的”，却还没有在内容区里真正“看到前面那些层长什么样”。

这会带来一个问题：

- hierarchy 的结构存在了
- 但页面主体仍然主要只服务当前层

如果要继续往 `readest` 式结构化 browse 靠，路径不该只是一行 breadcrumb，它还应该在 landing 里有内容化的存在。

## 这次要补什么

这次把 ancestor trail 再推进一步，补成内容区里的 ancestor landing rail：

1. 对每一层祖先 trail，都重新算出该层自己的 scoped books
2. 复用已有 group overview 的摘要和指标逻辑
3. 在当前 group overview 之前，先渲染一组祖先 landing cards
4. 每张卡都能直接跳回对应祖先层

所以这次不是再加一个“回退按钮”，而是让祖先层本身也进入页面内容结构。

## 改动概览

- 在 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte) 里新增 `LibraryTrailLanding`
- 新增 `getScopedLibraryBooksForTrail(...)`，按 trail 顺序逐层过滤得到每层 scoped books
- 新增 `getLibraryTrailLandings(...)`，把祖先层转换成可以直接渲染的 landing cards
- 在 desktop 和 starter 两条 library 路径里，都把 ancestor landing rail 放到当前 group overview 之前

## 为什么这一步重要

### 1. breadcrumb 解决“知道路径”，landing card 解决“理解路径”

breadcrumb 更像导航控件，它回答的是：

- 我从哪一层走下来了？

ancestor landing card 回答的是：

- 那一层本身是什么？
- 那一层里有多少书、多少作者、多少归类？

对结构化浏览来说，这两个层面都需要。

### 2. 这让 hierarchy 不再只存在于 chrome

如果 hierarchy 只存在于 header，它更像浏览器的地址栏信息。  
这次把祖先层搬进内容区之后，层级结构就开始成为 page composition 的一部分，而不是外围说明。

这很关键，因为 `readest` 风格的浏览差异，很多时候不是单个控件，而是页面自己怎么组织这些层。

### 3. 仍然坚持复用现有 overview 语义

这次没有新造另一套 ancestor summary schema，而是继续复用已有的 group overview 语义：

- 组标题
- 组摘要
- 组指标

这样 ancestor rail 和 current group overview 读起来是同一种语言，不会让页面上半部突然换一套产品语法。

## 结果

现在 `br1` 的 grouped library browse 在 deeper trail 下已经变成：

- header 有 breadcrumb trail
- 内容区先显示祖先 landing cards
- 再显示当前 group overview
- 然后是当前 group 的 subgroup shelves 和最终书单

这让 grouped browse 从“能多层跳转”进一步变成“多层都在页面里有自己的存在感”。

## 验证

- `pnpm check`（PASS）
- `git diff --check`（PASS）

## 未覆盖项

- 这次没有补 dedicated e2e 去断言 ancestor landing card 的回跳
- ancestor rail 目前还是线性祖先列表，不是 tree / graph
- 还没有把祖先 landing 继续扩成每层都可展开的独立 multi-level landing
