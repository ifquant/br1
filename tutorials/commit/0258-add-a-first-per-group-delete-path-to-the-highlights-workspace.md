# 0258: 给 highlights workspace 补第一条按组删除路径

这次没有继续补 secondary-format 证据，也没有再扩 selection 状态本身，而是把上一刀已经出现的组级管理面推进成了真正可执行的组级动作：

- `删除本组高亮`

## 为什么这刀值得做

到 `0257` 为止，`highlights` workspace 已经第一次具备了：

- `选中本组高亮`
- `清空本组选择`

这说明章节分组第一次进入了 selection-management 主链。  
但它还停在“组级选择”，没有真正进入“组级处置”。

如果没有这一刀，当前粒度仍然是：

- 单条高亮
- 当前视图
- 当前选择集

而章节组还只是一个“能选”的中间层，不是一个能直接操作的对象。

所以这刀的目标很直接：

- 让章节组本身第一次可以被整组删除

## 这次改了什么

文件：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte`
- `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`
- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`
- `/Users/dev/workspace2/hc_apps/br1/.planning/FEATURE-PARITY-AUDIT.md`

### 1. 每个高亮分组新增 `删除本组高亮`

在 `高亮` tab 的每个 group action row 里，现在除了：

- `选中本组高亮`
- `清空本组选择`

之外，还新增了：

- `删除本组高亮`

它的语义是：

1. 只作用于当前 group 的 `group.notes`
2. 走单独确认文案
3. 删除这组里所有高亮
4. 顺手把这组从 `selectedHighlightIds` 里清掉

也就是说：

- group-level delete 不是另起一套状态
- 还是继续复用现有 selection set

### 2. TXT web smoke 现在用组级删除收尾

原来的 TXT web smoke 最后是：

- `删除当前视图高亮`

现在改成：

- `删除本组高亮`

这样 TXT web 证明的是：

1. 这组高亮可以先被选中
2. 可以进入 `已选高亮`
3. 可以清空本组选择
4. 最后整组删掉
5. 笔记仍然保留

所以 group-level path 现在已经有了真正的完整闭环，而不是只会“选”和“清空”。

### 3. EPUB desktop regression 也改成组级删除收尾

现有的 `persists epub highlights and notes separately through the desktop reader store` 这条 regression，最后也不再走：

- `删除当前视图高亮`

而是改成：

- `删除本组高亮`

这样 EPUB desktop 也开始证明：

- 章节组不仅能作为 selection seed
- 也已经能作为 delete target

## 为什么这次不扩到 secondary-format

这次我仍然有意把范围压在：

- `TXT web`
- `EPUB desktop`

原因和前一刀一样：

- 先把 group-level delete 这个新粒度本身锁稳
- 再决定要不要把同等级证据推进到 `FB2 / MOBI / AZW3`

否则很容易又退回“补更多格式证据”，而不是继续把管理面本身做深。

## 审计表同步了什么

`FEATURE-PARITY-AUDIT.md` 这次新增了一条明确结论：

- 已经有第一条 `per-group delete path`

当前证据范围是：

- `web TXT`
- `desktop EPUB`

这能让功能总账准确反映当前状态：

- 章节组现在不只是一个可见分组
- 也不只是一个可选集合
- 它已经开始成为一个可直接操作的对象

## 这刀没做什么

这次没有补：

- `FB2 / MOBI / AZW3` 的 group-level delete evidence
- group-level invert-selection
- cross-group bulk operations
- cross-chapter selection persistence

所以它只是：

- 给 highlights workspace 补第一条按组删除路径
- 并先用 `TXT web + EPUB desktop` 把这条路径锁住

不是 secondary-format 的全量推进。

## 验证

本次实际运行：

```bash
pnpm exec playwright test tests/e2e/library-smoke.spec.ts --reporter=line
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'persists epub highlights and notes separately through the desktop reader store' --mochaOpts.timeout 180000"
pnpm check
git diff --check
```

结果：

- `PASS`
- `PASS`
- `PASS`
- `PASS`
