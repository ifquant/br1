# 0264: 给 highlights workspace 加第一版已保存选择集

这一刀不再继续补格式证据，而是开始真正往上抬 `highlights` 的管理面。

前面已经有：

- `selected-only`
- `per-book selection persistence`
- `group-level actions`

但这些都还是“当前会话里的临时选择集”。  
如果用户想把一组已经挑好的高亮先存下来，后面再回来继续处理，之前还没有一个正式入口。

所以这刀只做一件事：

- 给 `highlights` workspace 增加第一版“已保存选择集”

并且先只锁最稳定的证据面：

- `TXT web`
- `TXT desktop`

## 改了什么

### 1. 扩展 highlights workspace state 模型

文件：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/types.ts`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/index.ts`
- `/Users/dev/workspace2/hc_apps/br1/src-tauri/src/models.rs`

新增了：

- `ReaderHighlightSelectionSet`

并把 `ReaderHighlightsWorkspaceState` 从原来的：

- `filter`
- `sort`
- `selectedIds`

扩成：

- `filter`
- `sort`
- `selectedIds`
- `savedSelections`

Rust 侧的 host-side 持久化结构也同步扩了字段，并通过 `serde(default)` 保持对旧状态文件的兼容。

### 2. 在 sidebar 里加入第一版保存/套用/删除工作流

文件：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte`

新增能力：

- `保存当前选择集`
- 已保存选择集列表
- `套用`
- `删除`

这一版的行为很克制：

- 只有当前确实有选中的高亮时，才能保存
- 保存时通过 `prompt` 取名
- 套用时会把当前 `selectedHighlightIds` 恢复成那组 ids，并切进 `已选高亮`
- 删除时需要确认

另外还补了最小的样式层，让它不是一块没有信息层级的技术列表。

### 3. 把 TXT web 和 TXT desktop 证据补到完整链路

文件：

- `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`
- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

这次锁的是最小但完整的用户链路：

#### TXT web

1. 先选中一条高亮
2. 保存为 `Web TXT 重点高亮`
3. `reload`
4. 确认保存的选择集还在
5. 清空当前选择
6. 套用保存的选择集
7. 确认重新回到 `1 已选高亮`
8. 删除保存的选择集

#### TXT desktop

1. 先选中一条高亮
2. 保存为 `Desktop TXT 重点高亮`
3. 关闭 reader window
4. 从 library 重开同一本书
5. 确认保存的选择集仍然存在
6. 清空当前 live selection
7. 套用保存的选择集
8. 确认重新回到 `1 已选高亮`
9. 删除保存的选择集

这样这条新能力一开始就不是“UI 上有按钮”，而是：

- web reload 能活
- desktop reopen 能活

## 为什么这刀先只锁 TXT

因为这刀的主风险不是格式适配，而是：

- state shape 扩展
- host-side persistence 兼容
- sidebar 管理链路
- prompt / confirm / apply / delete 的产品闭环

先用 `TXT` 把这条最小闭环打透，成本最低，信号也最干净。  
如果一开始就把 `EPUB/FB2/Kindle-family` 全混进来，很容易把“新管理能力是否成立”和“各格式回归是否稳定”缠在一起。

## 验证

- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts --reporter=line` (PASS)
- `bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'persists txt highlights and notes separately through the desktop reader store' --mochaOpts.timeout 180000"` (PASS)
- `cargo check --manifest-path src-tauri/Cargo.toml` (PASS)
- `pnpm check` (PASS)
- `git diff --check` (PASS)

## 这刀之后的状态

现在 `highlights` workspace 已经不只是：

- 临时选择
- 临时排序
- 临时 selected-only

而是第一次有了“可命名、可恢复、可删除”的已保存选择集。

但它还只是第一版，后面还没做：

- 多格式回归扩展
- 重命名保存集
- 保存集排序
- 保存集导出
- 跨章节/跨书 selection-set 工作流

所以下一步如果继续，最自然的是：

- 把这条已保存选择集证据扩到 `EPUB desktop`

而不是马上跳去做更重的导出或跨书能力。
