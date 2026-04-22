# 0393 - 给书库补一层真正可浏览的 group by

## 背景

之前 `br1` 的 library 页已经有很多筛选能力：

- 搜索
- 状态筛选
- 格式筛选
- 归类筛选
- 标签筛选

但它仍然缺一层更接近 `readest` 的“浏览组织”能力。  
也就是说，用户可以筛选书，却还不能把书库真正组织成：

- 按作者看
- 按归类看
- 按格式看

这会让页面更像一个“加了很多筛选条件的平铺列表”，而不是一个真正可浏览的书架。

## 主要目标

这次提交不再继续补单个卡片或小按钮，而是补一层更大粒度的 library 导航面：

1. header 的更多操作菜单现在同时控制 `排序 + 分组`
2. 主书架现在支持 `不分组 / 按作者 / 按归类 / 按格式`
3. 分组后的书架会显示每组标题和数量说明，而不是继续把所有书平铺在一个大网格里

这让 `br1` 的 library 从“筛选驱动”往“浏览驱动”走了一步，更接近 readest 的书架心智。

## 改动概览

- 在 [`src/lib/components/library/LibraryHeader.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryHeader.svelte) 的更多操作菜单中加入 `书库分组`
- 在 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte) 新增 `libraryGroupBy` 状态，并把它接进 library scroll context
- 在 [`src/lib/components/library/BookshelfPreview.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/BookshelfPreview.svelte) 按当前书序生成分组 section，并渲染组标题 / 组摘要
- 在 [`.planning/FEATURE-PARITY-AUDIT.md`](/Users/dev/workspace2/hc_apps/br1/.planning/FEATURE-PARITY-AUDIT.md) 更新 Library Management 的现状描述

## 关键知识

### 1. 筛选和分组不是一回事

筛选回答的是：

- “我要把哪些书排除掉？”

分组回答的是：

- “我要按什么结构浏览剩下的书？”

很多页面把这两件事混在一起，结果就是筛选能力越来越多，但浏览结构始终没有升级。  
这次补的 `group by`，本质上是在补“浏览结构”，不是又加一种筛选。

### 2. 分组顺序最好继承当前书序，而不是另起一套独立排序

这次 `BookshelfPreview` 没有额外发明一套 group 排序规则，而是沿用当前已经算好的书序，再按第一次出现的顺序建立 group。  
这样做的好处是：

- 不会和当前 `recent / added / title / author / format` 的排序心智打架
- 可以让分组只是“组织方式改变”，而不是突然让整页的排序感觉变掉

对已有页面做大粒度升级时，这种“保留原排序、只换组织层”的策略通常更稳。

## 验证

- `pnpm check`（PASS）
- `git diff --check`（待本提交执行）

## 未覆盖项

- 这次没有继续做 readest 那种更深的 group breadcrumb / group drill-down 导航
- 这次没有加作者/归类管理面板，只补了浏览层的 group by
- 这次没有给 group by 增加专门的 e2e，用例验证仍以后续 library 流程回归为主
