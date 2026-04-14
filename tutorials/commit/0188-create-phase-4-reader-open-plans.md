# 0188: 为 Phase 4 补齐 reader 打开链路与格式基座计划

## 这次改动解决什么

`Phase 3` 的 library/workflow 线已经基本收口，下一步自然要转到 reader 主打开链路。

但当前 roadmap 里虽然已经定义了：

- `Phase 4: Reader Open Pipeline and Format Base`

却还没有真正的 `PLAN.md` 文件。

没有这些 plan，后续执行就容易发散成“边修 EPUB 边碰 PDF，再顺手改一点 reader 布局”，最后 scope 会失控。

所以这一步只做一件事：

- 把 `Phase 4` 补成可执行的三份计划

## 这次具体做了什么

### 1. 新建 `04-01-PLAN.md`

文件：`.planning/phases/04-reader-open-pipeline-and-format-base/04-01-PLAN.md`

这份 plan 专门处理：

- `EPUB` 打开主路径
- 正文渲染
- 恢复位置
- `foliate-js` 主链路的收口

重点是先把 `EPUB` 从“已经能打开，但还有历史 bridge/fallback”推进成正式主路径。

### 2. 新建 `04-02-PLAN.md`

文件：`.planning/phases/04-reader-open-pipeline-and-format-base/04-02-PLAN.md`

这份 plan 专门处理：

- `PDF`
- `pdf.js`
- wasm
- `setup-vendors`

也就是把最脆弱的 `PDF vendor / wasm` 依赖面单独拎出来，避免和 `EPUB` 混在一起排障。

### 3. 新建 `04-03-PLAN.md`

文件：`.planning/phases/04-reader-open-pipeline-and-format-base/04-03-PLAN.md`

这份 plan 负责收尾：

- 跨格式打开服务
- 共享错误语义
- route / service / viewport 之间的职责边界

它的目标是给 `Phase 5` 的 reader layout parity 准备一个更稳的格式基座。

### 4. 同步更新 roadmap 和 state

文件：

- `.planning/ROADMAP.md`
- `.planning/STATE.md`

把 `Phase 4` 从：

- `Plans: TBD`

更新成：

- `Plans: 3 plans`

同时把当前 focus 切到 `Phase 4 planning`，让后续执行不再继续留在 `Phase 3` 的语境里。

## 这次学到的编程知识

### 知识点 1：格式基座和视觉对齐最好拆 phase

如果把下面几件事混在一起做：

- EPUB/PDF 打开稳定性
- vendor/wasm
- reader 几何与视觉对齐

那排障时就很难判断问题到底属于：

- 数据/格式层
- 渲染层
- 布局层

更稳的办法是先把格式基座做实，再进入视觉对齐。

### 知识点 2：plan 的价值是“防止执行时 scope 漂移”

很多时候计划不是为了写文档，而是为了提前决定：

- 哪些这一步处理
- 哪些明确不处理

这样到执行时，面对真实 bug 或诱人的顺手优化，才不容易把 phase 做歪。

## 这次没有处理什么

- 没有开始执行 `Phase 4`
- 没有改任何产品代码
- 没有处理 reader 本身的 EPUB/PDF 问题，只完成了 planning 收口
