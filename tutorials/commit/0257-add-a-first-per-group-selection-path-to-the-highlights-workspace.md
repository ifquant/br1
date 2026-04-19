# 0257: 给 highlights workspace 补第一条按组选择路径

这次没有继续补 secondary-format 证据，也没有再加新的删除模式，而是把 `highlights` 管理面继续往上抬一层：

- 从“整屏选择”推进到“按组选择”

也就是让当前章节分组本身，第一次拥有自己的 selection-management 入口。

## 为什么这刀值得做

到 `0256` 为止，`highlights` workspace 已经有：

- 当前视图批量操作
- 部分选择
- 反选
- `已选高亮` 视图

但这些动作都还是“整屏集合”层面的。  
一旦用户按章节看高亮，当前产品面还缺一个明显的中间层：

- 只操作这一组高亮

没有这一层，selection management 还是只能在：

- 单条高亮
- 整个当前视图

之间跳，缺少真正有用的 group-level 手柄。

所以这刀的目标就是：

- 给每个高亮分组补第一条 selection-management 入口

## 这次改了什么

文件：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte`
- `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`
- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`
- `/Users/dev/workspace2/hc_apps/br1/.planning/FEATURE-PARITY-AUDIT.md`

### 1. 每个高亮分组都新增了两条组级动作

在 `高亮` tab 里，每个分组标题下面现在多了：

- `选中本组高亮`
- `清空本组选择`

它们只作用于这个分组自己的 `group.notes`，不碰别的章节。

这意味着 selection management 第一次有了三层粒度：

- 单条高亮
- 当前章节组
- 当前视图

### 2. 组级动作直接作用于现有选择集

这次没有重建新的选择模型，而是继续复用：

- `selectedHighlightIds`

所以：

- `选中本组高亮` 会把这一组的所有高亮并入当前 selection set
- `清空本组选择` 会把这一组的高亮从 selection set 里移出去

这样它和现有的：

- `已选高亮`
- `反选当前视图高亮`
- `删除选中高亮`

都还是同一套选择集，不会分裂成两套状态。

## 为什么先锁 TXT web + EPUB desktop

这次依然故意不扩到所有格式。

先锁两条最值钱的路径：

- `TXT web`
- `EPUB desktop`

原因很直接：

- `TXT` 适合验证组级动作本身不是空按钮
- `EPUB` 适合证明 group-level selection 已经进入主 reader surface

等这层稳定后，再决定是否把同等级证据推进到 `FB2 / MOBI / AZW3`。

## 测试里验证了什么

### TXT web smoke

现在 TXT web smoke 会在 `高亮` tab 里：

1. 切到 `最早添加`
2. 点击 `选中本组高亮`
3. 确认 meta row 变成 `已选 2 条`
4. 进入 `已选高亮`
5. 确认两条高亮都在 selected-only 视图里
6. 回到 `全部`
7. 点击 `清空本组选择`
8. 确认回到 `未选高亮`

这说明：

- group-level select 能把整组推入选择集
- group-level clear 能把整组从选择集里拿掉
- selected-only 视图会消费到这组级选择结果

### EPUB desktop regression

现有的 `persists epub highlights and notes separately through the desktop reader store` 也补了同一层：

1. 进入 `高亮` tab
2. 切到 `最早添加`
3. 点击 `选中本组高亮`
4. 确认 `已选 2 条`
5. 切到 `已选高亮`
6. 确认 selected-only 里出现整组高亮
7. 回到 `全部`
8. 点击 `清空本组选择`
9. 确认回到 `未选高亮`
10. 然后才继续后面的单条选中、selected-only、反选、删除链路

这说明新 group-level action 不是额外分叉，而是已经能接进现有 selection-management 主链。

## 审计表同步了什么

`FEATURE-PARITY-AUDIT.md` 这次新增了一条明确结论：

- 现在已经有第一条 `per-group selection-management path`

当前证据范围是：

- `web TXT`
- `desktop EPUB`

这样总账就不再只描述：

- selected-only
- invert-selection
- partial delete

而是会反映：

- 组级管理层已经开始出现

## 这刀没做什么

这次没有补：

- `FB2 / MOBI / AZW3` 的 group-level selection evidence
- group-level delete
- group-level invert-selection
- cross-chapter group persistence

所以它只是：

- 给 highlights workspace 补第一条按组选择路径
- 并先用 `TXT web + EPUB desktop` 锁住

不是 secondary-format 全量推进。

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
