# 0260: 按 book 持久化 highlights 的选择集状态

这次没有再补同等级的 group-level 证据，而是把 `highlights` 的选择集从“当前会话里的临时状态”推进成了“按书恢复的工作对象”。

目标很明确：

- 让 `selectedHighlightIds`
- `highlightsFilter`
- `highlightsSort`

第一次和 `bookKey` 绑定落盘，这样 reload 或 reopen 后，不会把刚建立好的选择集直接丢掉。

## 为什么这刀值得做

到 `0259` 为止，`highlights` workspace 已经有了不少操作能力：

- `已选高亮`
- `最近添加 / 最早添加`
- `反选当前视图高亮`
- `反选本组高亮`
- `删除选中高亮`
- `删除本组高亮`

问题是，这一整套管理能力仍然有一个明显短板：

- 一刷新就丢
- 一重开就回默认

这会让 selection set 始终只是一个一次性临时操作状态，而不是一个真正的工作对象。

所以这刀的目标不是再加更多按钮，而是先让这组状态可以按 `bookKey` 恢复：

- 你刚选中了哪几条高亮
- 当前是不是停在 `已选高亮`
- 当前排序是不是 `最早添加`

## 这次改了什么

文件：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte`
- `/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte`
- `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`
- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`
- `/Users/dev/workspace2/hc_apps/br1/.planning/FEATURE-PARITY-AUDIT.md`

### 1. `ReaderSidebar` 现在按 `bookKey` 持久化 highlights workspace 状态

`ReaderSidebar.svelte` 新增了：

- `bookKey` prop
- `br1.reader.highlights.workspace:${bookKey}` storage key

落盘内容只有三项：

- `filter`
- `sort`
- `selectedIds`

也就是说，这刀没有去碰：

- note 内容
- highlight 内容
- bookmark 内容

它只负责保存“你怎么管理这批高亮”的工作面状态。

### 2. 恢复逻辑按书独立，不混别的书

这次不是全局一个 `highlights workspace` 偏好，而是按 `bookKey` 分桶。

这样做的原因很直接：

- 一本书的 selection set 不该污染另一本书
- `TXT` 的高亮选择集不该跑到 `EPUB`
- `EPUB` 的 `selected-only` 视图也不该默认套到其他书

所以现在的 storage key 是：

- `br1.reader.highlights.workspace:<bookKey>`

### 3. TXT web smoke 现在直接验证 reload 后还能回到 selected-only

原来的 TXT web smoke 在：

- 选中一条高亮
- 切到 `已选高亮`

之后，就直接回到 `全部` 继续做后续清理。

现在中间新增了一刀：

1. 在 `已选高亮` 视图里确认只剩那一条高亮
2. 直接 `page.reload()`
3. 回到 `高亮` tab
4. 再次确认：
   - 还是 `1 已选高亮`
   - 还是 `最早添加优先`
   - 还是那条同一高亮

这说明 web 路径上，selection set 已经不是临时 UI 状态了。

### 4. TXT desktop regression 也验证 reopen 后恢复

桌面的 `TXT` 主路径 regression 这次也补了一刀同样的验证：

1. 选中一条高亮
2. 进入 `已选高亮`
3. 确认当前只剩这一条
4. 关闭 reader 窗口，再从 library 重开同一本书
5. 回到 `高亮` tab
6. 再次确认：
   - `1 已选高亮`
   - `最早添加优先`
   - 还是那条同一高亮

这个证据很关键，因为它证明：

- selection persistence 不只是 web 本地页面行为
- 它已经进入真实 desktop reader 主路径

## 为什么这次只锁 `TXT web + EPUB desktop`

这次我还是故意把证据范围压在：

- `TXT web`
- `TXT desktop`

原因是这刀的目标不是“每个格式都补一遍”，而是先确认：

- 选择集状态落盘
- reload/reopen 后恢复
- 不会直接写坏现有高亮管理链

等这条能力本身锁稳，再决定要不要把同等级证据扩到 `FB2` 和 Kindle-family。

## 审计表同步了什么

`FEATURE-PARITY-AUDIT.md` 这次新增了一条明确结论：

- 现在已经有第一条 `per-book highlights selection-persistence path`

当前证据范围写死为：

- `web TXT`
- `desktop TXT`

这能让功能总账反映真实状态：

- selection set 不再只是临时操作状态
- 它已经开始成为“可以恢复的工作对象”

## 这刀没做什么

这次没有补：

- `EPUB / FB2 / MOBI / AZW3` 的 selection-persistence evidence
- cross-chapter selection persistence
- selected-only 下的专属 group action 组合
- export / archive / saved selection sets

所以这刀只是：

- 给 highlights workspace 补第一条按书恢复的选择集状态
- 并先用 `TXT web + TXT desktop` 把这条能力锁住

不是完整的 saved-collection 系统。

## 验证

本次实际运行：

```bash
pnpm exec playwright test tests/e2e/library-smoke.spec.ts --reporter=line
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'persists epub highlights and notes separately through the desktop reader store' --mochaOpts.timeout 180000"
```

改成：

```bash
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'persists txt highlights and notes separately through the desktop reader store' --mochaOpts.timeout 180000"
pnpm check
git diff --check
```

结果：

- `PASS`
- `PASS`
- `PASS`
- `PASS`
