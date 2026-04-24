# 0531 - 重新定义下一条 Readest parity 主线

这刀不改产品代码，改的是仓库里的执行事实。

`br1` 这条 Readest 对齐线走到现在，`P1` 和 `P2` 实际上已经收完了：

- reader 能力面已经闭合了一大批高可见能力
- service / sync / KOReader 边界也补到了可合并、可维护的程度
- 最近几刀甚至已经从“加功能”切到“post-merge trust boundary 和事务性修正”

如果这时候 checklist 还继续沿用旧叙事，就会出现一个很典型的问题：

- 仓库已经到了下一阶段
- 但计划文档还在暗示“主要差距是 reader/service 能力不够”

这会直接误导下一刀往哪里切。

所以这次 commit 的目标很明确：把“接下来该对齐什么”重新写进仓库，只保留一条新的 parity 主线。

相关文件：

- [`/Users/dev/workspace2/hc_apps/br1/.planning/READEST-ALIGNMENT-CHECKLIST.md`](/Users/dev/workspace2/hc_apps/br1/.planning/READEST-ALIGNMENT-CHECKLIST.md)

## 这刀做了什么

1. 重写 `Current Baseline`

   checklist 现在明确承认一件事：

   - `br1` 的第一条 Readest 对齐主线已经不是“reader/service 很弱”的状态了

   文档里把已经收口的强项重新列清楚：

   - reader assistance、translation、TTS、visual/focus aids、parallel read、code highlighting
   - OPDS / Calibre
   - local snapshot / Readest Cloud / KOReader exchange + progress sync
   - 最近补上的 transactional restore hardening

   同时把主差距重新收敛成真正剩下的用户可见问题：

   - library header / search / tool semantics
   - shelf card hierarchy 和 section product semantics
   - continue reading / recent reading 的首页工作流
   - Readest local-library migration 的兼容语义

2. 把下一条主线正式定义成 `P3 Library Product Parity`

   新的 `P3` 不再围着 sync/provider 扩散，而是明确回到 library 产品面。

   这次直接把旧 phase 里仍然有效的部分压成 5 个可执行项：

   - `P3-1.1` 顶部工具条和搜索行为
   - `P3-1.2` 卡片、封面、元数据和状态密度
   - `P3-1.3` 排序、筛选、section 和滚动行为
   - `P3-2.1` continue reading / recent reading 产品化
   - `P3-2.2` Readest 本地书库迁移和兼容语义

   这样下一轮继续时，不需要再靠聊天记忆猜“是不是该做 library 了”，而是 checklist 直接给出主线。

3. 顺手把旧收口里的占位哈希回填干净

   这次也把 checklist 里还残留的几处 `this commit` 一起换成了真实 commit：

   - `P2-3.1` → `f481f3a`
   - `P2-3.3` → `00d5fd1`
   - `P2-3.4` → `d8695f8`
   - `P2-4.9` → `57424d5`
   - completion log 里的 3 条 recent closeout 也都补成真实哈希

   这一步很小，但必要。否则“旧阶段已闭合”这件事本身都还带着维护噪音。

## 为什么这刀值得单独提交

因为这不是装饰性文档更新，而是执行方向修正。

在一个已经跑了很多 commit 的 parity 项目里，最危险的不是少一条 todo，而是：

- 旧 checklist 还在描述昨天的问题
- 新代码已经开始面对今天的问题

一旦文档和真实阶段错位，后面每次“继续”都会更容易切到错误方向。

这次提交解决的就是这个错位：

- 旧主线正式收口
- 新主线正式命名
- 下一刀开始应该优先切 library product parity，而不是继续深挖 sync/provider

## 下一步应该怎么接

按这个新 checklist，最合理的下一刀就是：

- `P3-1.1 Align the library top toolbar and search behavior`

原因很简单：

- 它是 library product parity 的入口层
- 会决定后面 card / section / continue reading 的交互语义
- 比直接先修卡片样式更接近真正的产品收口顺序

## 验证

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`（PASS）
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`（PASS）

## 没有包含

- 没有开始实现 `P3-1.1` 的任何 UI 或行为改动
- 没有继续扩 `sync`、`provider` 或新的 reader 能力
