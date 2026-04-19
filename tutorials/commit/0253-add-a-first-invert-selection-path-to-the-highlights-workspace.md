# 0253: 给 highlights workspace 补第一条反选路径

这次没有继续补格式证据，也没有再加新的标注类型，而是沿着已经成型的 `highlights` 管理面，继续往上补一层真正有用的 selection management：

- `反选当前视图高亮`

## 为什么这刀值得单独做

到 `0252` 为止，`highlights` workspace 已经能证明：

- 独立查看高亮
- `最近添加 / 最早添加` 排序
- 选中部分高亮
- 删除选中的高亮
- 删除当前视图中的全部高亮

但这里还缺一个明显的操作断层：

- 选中过一部分之后，无法快速把当前选择翻转

这会让 selection management 仍然停留在“能选、能删”，而不是开始变成真正能操作一组高亮的管理面。

所以这刀的目标不是继续扩 feature list，而是把已有的 multi-select 体系往上抬一层：

- 允许当前视图里的高亮做一次显式 `反选`

## 这次改了什么

文件：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte`
- `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`
- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`
- `/Users/dev/workspace2/hc_apps/br1/.planning/FEATURE-PARITY-AUDIT.md`

### 1. 给 highlights workspace 增加 `反选当前视图高亮`

在 `ReaderSidebar` 里，`高亮` tab 的 action row 现在多了一项：

- `反选当前视图高亮`

它的语义很直接：

1. 只看当前 `sortedHighlights`
2. 当前已选的变成未选
3. 当前未选的变成已选
4. 不影响当前视图以外的高亮

这意味着它是：

- 跟当前 `filter`
- 跟当前 `sort`
- 跟当前视图范围

绑定的局部管理动作，而不是全局的“反选全部高亮”。

### 2. 用 TXT web smoke 先锁最小可见行为

在 `library-smoke.spec.ts` 里，这条路径现在会验证：

1. 先做 `2 高亮 + 1 笔记`
2. 切到 `最早添加`
3. 选中第一条高亮
4. 点击 `反选当前视图高亮`
5. 确认：
   - 仍然是 `已选 1 条`
   - 第一条变回未选
   - 第二条变成已选
6. 再执行 `删除选中高亮`
7. 确认留下的是最早那条高亮，而不是刚刚被反选中的那条

这样能证明：

- 反选不是空按钮
- 它会真正改变当前 selection set
- 后续删除动作消费到的是反选后的结果

### 3. 把同等级证据补到 desktop TXT 和 desktop EPUB

在 `app.e2e.ts` 里，我没有把这刀一下子扩到所有格式，而是先锁两条最值钱的主路径：

- `TXT`
- `EPUB`

原因很直接：

- `TXT` 是最稳定、最容易看清 selection 行为的 surface
- `EPUB` 是主 reader 路径，能证明这条管理能力不只是 plain-text 特例

两条 desktop regression 现在都会在：

1. `2 高亮 + 1 笔记`
2. 切到 `最早添加`
3. 选中第一条
4. 执行 `反选当前视图高亮`
5. 验证第二条变成选中
6. 删除选中高亮
7. 验证最终留下的是最早那条高亮

所以这刀补的是：

- `invert selection` 的产品面
- 以及它在 web + desktop 主路径上的真实证据

不是再补一轮 opening-path 测试。

## 审计表同步了什么

`FEATURE-PARITY-AUDIT.md` 这次补了两处表述：

- `Annotations and Highlighting` 的当前证据里，明确写进了：
  - `inverting the current visible highlight selection`
- 主 gap 段落里也明确写成：
  - 现在已经有第一条 `invert-selection` 路径
  - 证据范围是 `web + desktop TXT + desktop EPUB`

这样总账就不会继续停留在：

- “只能选中一部分然后删”

而会反映出：

- selection management 已经开始有真正的集合操作了

## 这刀没做什么

这次没有补：

- `FB2 / MOBI / AZW3` 的 invert-selection desktop evidence
- selection persistence
- inverse-selection 之后的跨章节选择集保留
- export / archive

所以它只是：

- 给 highlights workspace 补第一条反选路径
- 并先用 `TXT + EPUB` 把这条路径锁住

不是所有格式一次性收口。

## 验证

本次实际运行：

```bash
pnpm exec playwright test tests/e2e/library-smoke.spec.ts --reporter=line
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'persists txt highlights and notes separately through the desktop reader store|persists epub highlights and notes separately through the desktop reader store' --mochaOpts.timeout 240000"
pnpm check
git diff --check
```

结果：

- `PASS`
- `PASS`
- `PASS`
- `PASS`
