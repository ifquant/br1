# 0395 - 把书库分组浏览状态提升成真正的 route state

## 背景

上一刀已经让 `br1` 的书库支持：

- 按作者 / 归类 / 格式分组
- 进入某一组
- 返回整库

但那时这条路径仍然有一个结构性问题：  
`group by` 和当前进入的 group 只存在于组件局部 state 里。

这意味着它更像“页面里的一次交互结果”，而不像真正的 library navigation。  
如果后面要继续往 `readest` 的 library browse model 靠，只停在局部 state 是不够的。

## 这次要补什么

这次不是再补一个按钮，而是把 grouped browsing 的状态层级往上提：

1. 当前 `groupBy` 写进 library URL
2. 当前 `group` 也写进 library URL
3. library header 显式显示当前分组上下文
4. `返回整库` 从 shelf 内局部 breadcrumb，提升成 header 级导航动作

这让 grouped browsing 从“一个组件内部知道自己现在在看哪组”，变成“整个 library route 都知道当前在看哪组”。

## 改动概览

- 在 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte) 增加 `groupBy/group` 的 URL 同步逻辑
- `libraryGroupBy` 和 `libraryGroupScope` 改为由当前 route 驱动，而不是只靠局部赋值
- 进入 group、退出 group、切换 group by 都统一走 `syncLibraryBrowseLocation(...)`
- 在 [`src/lib/components/library/LibraryHeader.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryHeader.svelte) 增加当前分组上下文条和 `返回整库`
- 在 [`src/lib/components/library/BookshelfPreview.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/BookshelfPreview.svelte) 去掉局部 breadcrumb，让它只负责“进入某组”

## 为什么这一步重要

### 1. 只有进 URL，才算真正的页面导航状态

组件 state 适合表达：

- 菜单开关
- hover
- 临时输入

但不适合表达真正的 browse context。

“我现在在 library 里按作者浏览，并且正处在某个作者组内部”  
这是页面级状态，不是组件私有状态。

把它写进 URL 之后，整个页面结构都会更诚实：

- header 能知道当前 browse context
- scroll context 可以稳定依赖这条状态
- 后续如果要做更深的 group landing / drill-down，也有明确承接点

### 2. header 才是更合适的 group navigation 容器

之前 `BookshelfPreview` 里已经有一条 breadcrumb：

- 返回整库
- 当前组名

但它本质上仍然属于 shelf 内容的一部分。

这次把它上提到 header，原因很直接：

- 当前正在浏览哪一组，是整个 library 页面上下文
- 不只是主书架内容上下文

这更接近 `readest` 的做法：  
group navigation 应该占据页面导航层，而不是塞在某个 shelf section 里面。

### 3. 这一步是在给更深的 group browse 铺路

这次还没有直接做：

- 多级 group breadcrumb
- 单独的 group detail route
- group landing page

但这一步已经把基础地基打好了。

如果不先把 grouped browse state 提升到 route 层，后面每继续做一层 group navigation，都会继续堆在局部 state 上，最后只会越来越难维护。

## 结果

现在 `br1` 的 grouped library browse 已经不只是：

- 看见分组
- 进入一组
- 在当前内存状态里退回去

而是进一步变成：

- 分组浏览是 URL 可表达的页面状态
- header 明确承载当前分组上下文
- 返回整库是 library 级导航动作

这比继续补一个局部 breadcrumb 更接近真正的 `readest` library navigation。

## 验证

- `pnpm check`（PASS）

## 未覆盖项

- 这次还没有做多级 group route 或更深的 breadcrumb
- 这次没有补 dedicated e2e 去断言 `groupBy/group` URL 行为
- 这次没有继续扩展 collection/tag 的专门 browse landing
