# 0140: 给 reader 补最小书签切换能力

## 这次改动做了什么

这一步只做一个很窄的切片：让 `reader` 顶栏可以对“当前阅读位置”执行加书签 / 取消书签。

实际落地分成三段：

1. 新增 `ReaderBookmark` 类型和 `bookmarksController`
2. 新增 `readerBookmarks` service，并在 Tauri 侧补 `load/save_reader_bookmarks`
3. 在 reader 路由里同步当前 `ReaderPreviewState`，把 header 的星标按钮接到 `toggleCurrent()`

这样做的结果是：

- EPUB 有 `progressLocation` 时，会优先用它作为书签定位符
- 没有 CFI 的场景，会退化到 `chapterHref + locationLabel` 或 `locationLabel`
- 桌面端会落盘到 Tauri app data
- 非桌面端会退回 `localStorage`

## 为什么这样拆

这一步故意没有直接做完整的 bookmark 面板，因为那会把 sidebar、header、state shape 一次性一起改大。

先做“当前位置可收藏”有两个好处：

- 它是 Readest header 行为对齐里的一个独立最小闭环
- 它先把 bookmark 的数据模型和持久化边界立住，后面再做 sidebar/book details/notebook 时不会反复推翻

## 关键实现点

### 1. 书签定位符不要只依赖 EPUB CFI

如果书签只存 `progressLocation`，那 EPUB 会比较顺，但 PDF 或其他没有 CFI 的格式就会失效。

所以 controller 里做了一个分层 fallback：

```ts
progressLocation
-> chapterHref + locationLabel
-> locationLabel
```

这不是最终版 locator 设计，但足够支撑“最小 toggle 能力”。

### 2. controller 负责状态，而 route 只负责编排

这次没有把书签逻辑直接塞回 `reader/+page.svelte`，而是延续前面 search / notes / sidebar 的做法：

- controller 管 `refresh / syncPreview / toggleCurrent`
- route 只负责把 `ReaderPreviewState` 喂给 controller

这样后面如果要补：

- bookmark 列表
- bookmark 跳转
- current chapter bookmark 状态

都可以继续长在 controller 上，而不是把 route 再养回 God object。

## 这次顺手能学到的编程知识

### 知识点 1：UI 上的“当前是否已收藏”，最好基于“当前位置 key”而不是按钮本地状态

不要写成：

```ts
let isBookmarked = false;
```

然后点一下就翻转。因为一旦翻页、恢复位置、重新打开书，这个布尔值就会和真实数据脱节。

更稳的方式是：

- 每次 reader state 更新，都重新推导当前 locator
- 用 `bookmarks.some(...)` 判断当前位置是否已收藏

这是“由数据推导 UI”，不是“由按钮维护 UI”。

### 知识点 2：同一能力的 Web fallback 和 Desktop persistence，最好走同一个 service/controller 接口

这里 controller 不关心底下是：

- `localStorage`
- Tauri `invoke`

它只知道 `loadPersistedBookmarks` / `savePersistedBookmarks`。

这能避免把平台分支散到组件里。UI 组件只管触发行为，不管存储介质。

## 还没做的事

- 还没有 bookmark sidebar / tab
- 还没有“从书签列表跳转回正文”
- 还没有专门的 bookmark 自动化回归
- 还没有和 Readest 那种 notebook / bookmarks 分工完全对齐
