# 0403 - 把 ancestor landings 扩成 multi-level browse sections

## 背景

上一刀已经让 grouped browse 的祖先层不只存在于 header breadcrumb，而是进入了内容区：

- 先看到祖先 landing cards
- 再看到当前 group overview

但这些祖先 landing cards 还是偏静态：

- 可以回跳
- 可以解释这一层是什么
- 但还不能像当前层一样继续往下浏览

这就让 ancestor rail 仍然更像“回顾路径”，而不是“仍然活着的上游 browse surface”。

## 这次要补什么

这次把 ancestor landing sections 再推进一步，让它们也具备继续浏览能力：

1. 祖先层不再只是 summary card
2. 每个祖先 landing 也会重新算出自己的 subgroup shelves
3. 用户可以直接从某个祖先 landing 里，再沿作者 / 归类 / 格式继续往下进入
4. 进入时 trail 会被正确截断到该祖先层，而不是错误沿用当前更深层的 trail

换句话说，这次补的是：

- ancestor 不只是用来回头看
- ancestor 也是一个仍然可用的 landing

## 改动概览

- 在 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte) 里扩展 `LibraryTrailLanding`
- 让 `getLibraryTrailLandings(...)` 不只返回摘要和指标，也返回该层的 `scopedBooks` 和 `subgroupShelves`
- 新增 `enterLibraryGroupFromTrail(...)`，保证从祖先层继续进入下一层时，新的 trail 以该祖先为边界重新建立
- 把 ancestor rail 的单个 button 卡片改成真正的 landing section：上半部是 summary，下半部是 subgroup shelves

## 为什么这一步重要

### 1. 祖先层只有“回跳”，还不算真正多层 browse

如果 ancestor rail 只能点一下回去，它仍然偏像历史记录。  
真正的 multi-level browse 应该允许用户在中间层重新决策：

- 我不用先回到那一层再重新找入口
- 我可以直接在这一层的 landing 上继续往下走

这会让层级结构从“线性回退”升级成“分层 browse surface”。

### 2. 这让页面主体真的开始有多层结构

现在页面内容区已经不只是：

- 当前层 overview
- 当前层 subgroup shelves
- 当前层书单

而是开始变成：

- 祖先层 landing
- 祖先层 subgroup shelves
- 当前层 overview
- 当前层 subgroup shelves
- 当前层书单

也就是多层都开始在同一页里有自己的结构位置。

### 3. 路径截断必须正确，否则多层 browse 会变脏

从祖先层继续往下走时，不能简单复用当前更深层的 trail，否则路径会出现：

- 视觉上像是从祖先层继续
- 实际 route 里却还挂着不属于这条分支的更深祖先

所以这次专门加了 `enterLibraryGroupFromTrail(...)`，保证每次从祖先层继续进入时，trail 都以那个祖先为新的边界。

## 结果

现在 `br1` 的 grouped library browsing 已经不只是：

- header breadcrumb
- ancestor summary cards
- current group landing

而是进一步变成：

- header breadcrumb
- ancestor landing sections
- ancestor subgroup shelves
- current group landing
- current subgroup shelves

这让 grouped browse 开始更像一个真正的 multi-level landing，而不是单层 landing 外加一些路径提示。

## 验证

- `pnpm check`（PASS）
- `git diff --check`（PASS）

## 未覆盖项

- 这次没有补 dedicated e2e 去断言从祖先 landing 继续进入的新路径
- ancestor sections 目前还是线性序列，不是可展开树
- 还没有把整条 browse hierarchy 抽成真正的 tree / graph 导航模型
