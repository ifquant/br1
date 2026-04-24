# 0533 - 对齐 library 卡片、封面、元数据和状态密度

这刀是 `P3-1.2`，目标不是改数据流，而是把 library 的书籍呈现从“有信息”推到“有明确层级”。

上一刀 `0532` 已经把顶层控制面收回 header。现在最直观的 Readest 差距就落在书本本身怎么被看见：

- 封面比例像不像真正的书
- 标题、作者、状态、进度谁先被看到
- grid/list 和 continue reading 看起来是不是同一套产品语言

相关文件：

- [`/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/BookshelfPreview.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/BookshelfPreview.svelte)
- [`/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/ContinueReadingShelf.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/ContinueReadingShelf.svelte)

## 这刀做了什么

1. 收紧主书架卡片的“书本感”

   `BookshelfPreview` 这次没有动行为，只重排视觉层级：

   - 封面比例从更宽的卡片感，收成更接近书册的比例
   - 标题和作者被提升为主层
   - 状态和进度不再混在一堆次级元数据里
   - grid/list 两种视图都开始围绕同一套书本语义来排布

   尤其是 list 模式，之前更像“左边封面、右边一堆字段”。现在它更接近“书名/作者是主体，状态和进度是结果层，其他信息是辅助层”。

2. 把 continue / recent reading 行卡也拉到同一条视觉语言上

   `ContinueReadingShelf` 之前已经有完整行为，但层级还是偏平均：

   - 标题
   - 状态
   - 来源
   - 进度
   - 操作

   这些都在同一层竞争注意力。

   这次把它重排成更像真正的 reading-first row：

   - 标题先立住
   - 状态 / 来源变成较轻的 pill row
   - 右侧进度信息变成更明确的 progress stack
   - resume / repair 的语义 pill 仍保留，但更像操作语义，不再只是杂糅在 trailing 里

   这样继续阅读区和主书架不再像两套独立 UI，而更像同一产品里的不同密度视图。

3. 保持行为边界不动

   这刀特意没有去碰这些高风险面：

   - grouped-browse 导航
   - 元数据详情动作
   - repair / remove / manual relink 逻辑
   - section 规则和排序规则

   原因很简单：`P3-1.2` 是 visual hierarchy slice，不该借机把行为也搅进来。

## 为什么这刀值得单独提交

因为 Readest parity 到这个阶段，很多差距不再是“功能没有”，而是“呈现不对”。

如果卡片和 row 的层级还停留在过渡态，就会持续暴露两个问题：

- grid/list 像两套不同的组件
- continue reading 和主书架像两个不同产品

这一刀的价值就在于把它们拉回同一视觉语法里。

## 验证

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`（PASS）
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`（PASS）
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test /Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts --grep "library renders the reading-first shell in web mode"`（PASS）

## 没有包含

- 没有改 grouped-browse 的 body 导航
- 没有改 continue reading / recent reading 的 section 规则
- 没有改 Readest 本地迁移兼容语义
