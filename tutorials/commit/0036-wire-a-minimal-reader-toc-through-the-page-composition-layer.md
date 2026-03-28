# 0036: 通过 page 组合层，给 reader 接上最小 TOC 跳转

这一提交的目标是把 reader 再推进一步：  
不只是“能翻页、能拖进度”，而是开始按书的结构导航。

这一步仍然只做最小版本：

- 读取 `foliate-view.book.toc`
- 在 sidebar 里显示一个扁平章节列表
- 点击后调用 `view.goTo(href)`

不做：

- 完整的树形 TOC
- 展开/折叠
- 当前章节滚动跟随
- 复杂 sidebar 状态管理

## 为什么这一步不直接上 store

这次最关键的决定不是“能不能把 TOC 列出来”，而是**让谁来协调这些状态**。

当前 reader 页面里有三个相邻表面：

- `ReaderSidebar`
- `ReaderWorkspace`
- 右侧 `Bridge` 面板

其中 TOC 数据来自 `ReaderViewport`，但点击导航发生在 `ReaderSidebar`。  
这意味着它天然跨组件。

这一步我故意没有直接上全局 store，而是先让 [`src/routes/reader/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte) 承担 **page composition layer** 的职责：

- `ReaderWorkspace` 往上派发：
  - `readerstate`
  - `tocchange`
  - `controlrequest`
- `ReaderSidebar` 往上发导航意图
- `+page.svelte` 统一持有当前：
  - `toc`
  - `activeLabel`
  - `controlRequest`

这是一个很实用的中间阶段架构。  
当交互已经跨组件，但还没复杂到值得全局 store 时，**先让 route/page 做协调层**，通常是更稳的选择。

## 改动概览

- 更新 [`src/lib/reader/types.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/reader/types.ts)
  - 新增 `ReaderTocItem`
  - 扩展 `ReaderControlRequest`，支持 `href`
- 更新 [`src/lib/reader/foliate.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/reader/foliate.ts)
  - 给 `FoliateViewElement` 补 `goTo(target)`
  - 新增 `flattenToc()`，把嵌套 TOC 压成最小扁平列表
- 更新 [`src/lib/components/reader/ReaderViewport.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte)
  - 样例书打开后派发 `tocchange`
  - 支持处理 `href` 导航命令
- 更新 [`src/lib/components/reader/ReaderWorkspace.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderWorkspace.svelte)
  - 不再自己藏控制状态
  - 改为把 `controlrequest / readerstate / tocchange` 往上派发
- 更新 [`src/lib/components/reader/ReaderSidebar.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte)
  - 从静态假目录改成真实 TOC 列表
  - 点击条目时通过回调发导航意图
- 更新 [`src/routes/reader/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte)
  - 作为 page composition layer 统一协调 sidebar 和 workspace

## 这次顺手学到的具体知识

### 1. “扁平 TOC” 是很好的中间形态

真实电子书目录经常是嵌套树：

```ts
[
  {
    label: "Part 1",
    subitems: [
      { label: "Chapter 1", href: "..." }
    ]
  }
]
```

但如果你一开始就做完整树形 UI，会把这一步的范围拉大很多。  
所以这次先做的是：

- 保留 `level`
- 把树压平
- 用 `padding-left` 表示层级

这样既保留了结构信息，又避免太早进入复杂交互。

### 2. 组合层比全局 store 更适合早期“少量跨组件状态”

如果状态只在一页内部跨 2 到 3 个组件传递，全局 store 往往不是第一选择。  
因为它会更早地把接口、生命周期和副作用扩散到整个项目。

这次的经验很典型：

- 先用 page 层协调
- 等交互稳定了，再决定是否升级成 store

这是比“看到跨组件就立刻上全局状态管理”更稳的一条路。

## 验证

我实际运行了：

```bash
pnpm check
git diff --check
```

结果：

- `pnpm check`：PASS
- `git diff --check`：PASS

## 还没做的事

这一提交**没有**处理：

- TOC 树形展开/折叠
- 当前章节自动滚动到可视区域
- 位置持久化
- sidebar 多 tab 真正切换
- 复杂 TOC active 匹配

它只把 reader 从“能移动”推进到“开始按章节结构导航”。
