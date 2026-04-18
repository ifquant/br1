# 0240: 给 reader sidebar 补第一版独立的 highlights workspace

这次不再继续补 annotation 的格式证据，而是开始把管理面从“一个混合 notes 列表”往真正的 workspace 结构推进。

## 为什么这刀现在做

前面几刀已经把 annotation 管理层收到了一个最小可用状态：

- `高亮` 和 `笔记` 已经是分开的持久化动作
- `notes workspace` 里已经有 `全部类型 / 高亮 / 笔记` 的筛选
- `TXT / EPUB / FB2 / MOBI / AZW3` 都已经补了 desktop 证据

但产品面上仍然有一个明显缺口：

- 所有 annotation 仍然被迫挤在同一个 `笔记` tab 里
- 想集中回看高亮时，必须先进 notes，再切 kind filter

这和真正的 workspace 结构还是两回事。  
所以这一刀的目标很明确：

- 不改数据模型
- 不做新一轮 annotation 重构
- 只把现有 `kind === 'highlight'` 的视图正式提成一个独立 workspace

## 这次改了什么

### 1. `SidebarTab` 正式新增 `highlights`

文件：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/types.ts`

原来 sidebar 只有：

- `toc`
- `search`
- `bookmarks`
- `notes`

现在新增：

- `highlights`

这一步的意义不是一个枚举值本身，而是把“高亮是独立工作区”这件事先落成正式路由状态，而不是继续当作 notes 内部的临时筛选。

### 2. `ReaderSidebar` 拆出独立的 `高亮` tab

文件：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte`

这里做了三件事。

#### a. 顶部 tabs 增加 `高亮`

也就是：

- 目录
- 搜索
- 书签
- 高亮
- 笔记

这样 reader sidebar 开始具备更像真正阅读工作区的层级，而不是所有 annotation 行为都塞到一个 tab 里。

#### b. 用独立派生状态构造 highlight-only workspace

我没有新建一套 highlights store，而是直接复用现有 `notesState.notes`，只把：

- `kind === 'highlight'`

派生成独立工作区需要的状态：

- `allHighlights`
- `highlightsByScope`
- `groupedHighlights`
- `collapsedHighlightGroups`

这样这刀是“产品结构推进”，不是“存储层重写”。

#### c. 新 workspace 有它自己的 scope 和 group controls

`高亮` tab 里现在有：

- `全部 / 当前章节`
- `全部展开 / 全部折叠`
- 按章节分组的高亮列表
- 点击卡片跳回正文
- 删除高亮

而且它不会再显示笔记正文或编辑动作，只显示：

- 章节
- 高亮 badge
- 时间
- 被高亮的正文

这和 mixed notes list 的语义就真正分开了。

### 3. book chip 的统计也开始区分 `高亮` 和 `笔记`

文件仍然是：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte`

原来顶部 book chip 只显示：

- `章节`
- `书签`
- `笔记`

现在改成：

- `章节`
- `书签`
- `高亮`
- `笔记`

这让 sidebar 顶部统计不再继续把 annotation 都压成“笔记”。

### 4. web smoke 开始验证新 workspace

文件：

- `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`

我是在现有 `TXT` annotation smoke 上继续扩的，不新开一条重复用例。

它原来已经会做：

1. 选中文本
2. 创建一条高亮
3. 创建一条笔记
4. 验证 kind filter
5. reload 后两条都还在

现在它还会继续：

1. 切到 `高亮` tab
2. 断言只剩高亮卡片
3. 断言高亮正文可见
4. 断言笔记正文 `txt note body` 不会混进来

这说明 `highlights workspace` 不只是新按钮，而是已经有真实行为证据。

## 这刀没做什么

这次刻意没做：

- header 新增 `高亮` 快捷按钮
- desktop 版 `highlights workspace` focused regression
- bulk delete / bulk export
- highlight 编辑
- dedicated highlights store
- cross-format 专门的 highlights workspace 回归

也就是说，这是一刀受控的产品结构切片：

- 先把独立 workspace 这层做出来
- 再决定要不要继续补 desktop 管理证据或更重的 bulk management

## 为什么这样切更稳

如果这刀同时去做：

- 新 tab
- header 入口
- desktop focused regression
- bulk 管理
- 新 store

它会立刻从“工作区结构”变成一次 annotation 子系统重构。

现在这样切的好处是：

- 数据层几乎不动
- notes 现有能力完全复用
- smoke 能直接证明新 workspace 不是死 UI
- 后面还能继续按小刀扩 desktop evidence

## 验证

这次实际跑了：

```bash
pnpm check
pnpm exec playwright test tests/e2e/library-smoke.spec.ts --reporter=line
git diff --check
```

结果：

- `PASS`
- `PASS`
- `PASS`
