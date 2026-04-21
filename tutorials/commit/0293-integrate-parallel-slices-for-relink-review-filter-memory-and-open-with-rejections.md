# 0293: integrate parallel slices for relink review, filter memory, and open-with rejections

这次提交继续沿着上一轮 subagent 并发节奏推进，但没有把范围扩到 `P1/P2`。

它仍然只收 `P0` 里的三个硬缺口：

- `Library Management`
- `Annotations and Highlighting`
- `File Association and Open With`

这三条看起来分散，实际共同目标是一样的：

- 不要让失败状态只停留在内部逻辑里
- 要把它们变成用户能看见、能筛选、能复核、能继续处理的工作面

## 这次实际补了什么

### 1. manual-only relink review 现在带记录身份和冲突提示

更新：

- `/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/ContinueReadingShelf.svelte`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/library/types.ts`

上一刀已经把 manual-only repair row 从普通 `修复副本` 里拆出来了。

这次再往前推一层：

- row action 改成 `先复核再重关联`
- detail panel 里显示当前要修的是哪条记录
- panel 明确列出：
  - 标题
  - 格式
  - 来源
  - 进度
- 如果发现同题名/作者/格式的待修复记录，或者相同 source path 的其他记录，会在面板里给出 conflict warning
- 真正进入 picker 的按钮改成 `确认后选择替换文件`

这不是在做复杂的文件内容比对。

它解决的是更基础的问题：

- 用户在选择替换文件前，必须知道自己正在修哪一条 library record
- 系统必须说明这次仍然走原位修复，不会创建重复条目

所以这刀把 manual relink 从“按钮动作”推进成了“复核工作流”。

### 2. saved-set refresh filter 现在按书保存

更新：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/types.ts`

上一刀已经有：

- `全部已保存`
- `完全匹配`
- `部分匹配`
- `未匹配`

但它们还只是一次会话里的 UI filter。

这次把 `savedSelectionsRefreshFilter` 并进了 `ReaderHighlightsWorkspaceState`：

- 切到 `部分匹配`
- reload
- 回到同一本书
- sidebar 仍然保持这个 saved-set review lens

同时 imported saved set card 现在会直接显示 unresolved count：

- `已全部映射 1/1`
- `未命中 1 条，可刷新映射`

这比只显示 `部分匹配` 更可操作，因为用户现在能直接看出还欠几条映射，而不是只知道“这组不是全量命中”。

### 3. open-with raw rejection 不再静默消失

更新：

- `/Users/dev/workspace2/hc_apps/br1/src-tauri/src/lib.rs`
- `/Users/dev/workspace2/hc_apps/br1/src/routes/+layout.svelte`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/formats.ts`

之前 associated/open-with intake 的主路径已经能处理：

- quoted paths
- `file://`
- cwd-relative paths
- duplicate requests

但如果传进来的是空输入或明显不支持的扩展，用户侧没有一个清楚的 shell-level 反馈。

这次补了两层：

1. Rust side
   - 在 queue 前先收集 raw rejection
   - 对 empty input / unsupported format 发出 `br1:associated-book-open-inputs-rejected`

2. Svelte shell
   - 监听这个事件
   - 显示可 dismiss 的 banner
   - 告诉用户忽略了多少 open-with input，以及前几个原始输入是什么

顺手，`formats.ts` 也从散落的 extension list 变成了单一 capability table：

- supported status
- packaged association
- text annotation support

这让 `CBZ` 这种“能读但不能正文批注”的边界继续保持显式，而不是靠到处写条件判断。

## Orchestrator 补了什么证据

### web smoke

更新：

- `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`

扩的是已有 TXT notes/highlights 长流程。

新增验证：

- cross-book saved set 出现 `未命中 1 条，可刷新映射`
- 切到 `部分匹配`
- reload
- 回到 `高亮` tab 后，仍然只显示部分匹配的 saved set
- 再切到 `完全匹配`，能看到 `已全部映射 1/1`

这直接覆盖了：

- refresh outcome filter 按书持久化
- unresolved count 在 card 上可见

### desktop focused regressions

更新：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

扩的是已有 recovery queue case：

- `bulk repairs eligible broken library copies while leaving manual relink items in the repair queue`

新增验证：

- manual-only CBZ row 显示 `待复核`
- row action 是 `先复核再重关联`
- 点击后先打开 detail panel
- detail panel 包含：
  - `这本书需要先核对当前记录，再选择替换文件`
  - `逐本复核`
  - `当前没有检测到同类冲突`
  - `确认后选择替换文件`

同时又跑了一遍 existing associated-book normalization regression，确认新的 open-with rejection reporting 没破坏已支持格式的 separate reader window 主路径。

## 为什么这次切片是合理的

这次没有继续补“更多格式证据”或“更多按钮”。

三个变化都在回答更接近 closeout 的问题：

- broken library item 到底该怎么让用户安全修？
- cross-book import/refresh 的失败状态怎么让用户持续管理？
- open-with 的无效输入怎么避免静默失败？

这些都是 `Partial -> 更接近 Completed` 的真实工作，而不是堆功能点。

## 还没做什么

这次仍然没有做：

- replacement file 选择后的内容级 preflight
- saved-set unresolved highlights 的逐条 drill-down
- packaged installer 级 open-with 真机矩阵
- 后续 canonicalization/queueing failure 的 dedicated banner

所以这刀不是 P0 结案，而是把几个会阻碍结案的失败面继续显性化。

## 你可以学到什么

### 1. failure surface 比 happy path 更能决定产品是否可闭环

到这个阶段，`br1` 已经不缺“能打开一本书”的证据了。

现在更关键的是：

- 修复失败时用户知道该做什么吗？
- 映射失败时用户能持续追踪吗？
- open-with 输入无效时用户能看到原因吗？

这类问题不解决，功能矩阵永远只能停在强 `Partial`。

### 2. capability table 比散落条件更可靠

`formats.ts` 这次看似只是重排，但方向是对的：

- 一个格式能不能读
- 能不能 package association
- 能不能正文批注

这些应该来自同一个 capability source。

否则 `CBZ` 这种边界格式迟早会在某个入口里又被误判。

## 验证

实际跑过：

```bash
pnpm check
cargo check --manifest-path src-tauri/Cargo.toml
pnpm exec playwright test tests/e2e/library-smoke.spec.ts --grep "reader supports txt notes through selection, persistence, and note reopen in web mode" --reporter=line
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'bulk repairs eligible broken library copies while leaving manual relink items in the repair queue' --mochaOpts.timeout 240000"
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'normalizes associated book requests before opening a separate reader window' --mochaOpts.timeout 180000"
```

结果：

- PASS
