# 0291: add a first bulk-repair path to the library recovery queue

这次提交继续沿着上一刀刚做出来的 library recovery surface 往前推，但没有再扩新领域。

目标很窄：

- `待修复书籍` 不再只支持逐本点 `修复副本 / 重新关联`
- 对那些“原文件还在、只是 library copy 丢了”的条目，允许一次批量修复
- manual-only 的条目继续留在队列里，不被错误吞掉

这是一刀 `Library Management` 的收口，不是新的 reader 功能。

## 这次实际补了什么

### 1. Recovery queue 现在有 header-level bulk action

更新：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/ContinueReadingShelf.svelte`

`ContinueReadingShelf` 以前只有 section title 和 description。

这次把它抬成了真正可承载 queue-level action 的容器：

- 新增可选 header action
- label 和 disabled state 都由上层传入
- 只在需要时显示，不会污染普通 `继续阅读 / 最近阅读`

这一步本身很小，但它让 recovery queue 第一次具备了“管理一整组条目”的能力，而不再只能处理单行 row action。

### 2. Library page 正式区分“bulk-repair eligible” 和 “manual-only”

更新：

- `/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte`

这次加了三层明确语义：

- `isPersistedRecordBroken`
  - 只负责判断条目是否进入 recovery universe
- `isPersistedRecordBulkRepairEligible`
  - 只认一种情况：
    - library copy 缺失
    - `sourcePath` 还在
- `isPersistedRecordManualRepairOnly`
  - 剩下那些必须人工 relink / 重新选文件的条目

然后 `待修复书籍` queue 头部会根据当前可自动修复的条目数，显示：

- `批量修复副本（N）`
- 或在执行时显示 `批量修复中…`

这不是 UI 小聪明，而是把 recovery queue 里的条目真正分了层：

- 可以自动修
- 只能人工修

### 3. Bulk path 复用了已有 repair contract，而不是新造一条 persistence 路

真正重要的是这里。

这次没有去发明新的“批量修复专用命令”，而是直接复用上一刀已经做出来的单书 repair/import contract：

- 遍历每个 eligible record
- 对每条调用已有 `importLibraryBooks([sourcePath])`
- 让底层继续沿用：
  - in-place repair
  - 保留旧 entry/progress
  - 避免 duplicate record

这样批量修复和单本修复不会出现两套不同语义，也不会把 library management 又拆回“两条各自漂移的修复路径”。

### 4. 批量执行后，notice 会明确告诉你还剩什么

bulk action 做完后，这次不会只弹一句“修好了”。

notice 会显式汇总：

- 成功自动修复了多少本
- 还有多少本必须手动重新关联或重新选择文件
- 还有多少本本次自动修复失败

这一步很值钱，因为 recovery queue 的问题从来不只是“能不能修”，而是“修完之后你还剩什么债”。这次开始把这层状态直接暴露给用户。

## Orchestrator 补了什么证据

这次只补了一条 desktop focused regression，没有扩 web smoke。

更新：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

新增 case：

- `bulk repairs eligible broken library copies while leaving manual relink items in the repair queue`

这条回归会：

1. 导入两本不同标题的样例书
2. 把其中一本改成：
   - library copy 缺失
   - source 仍然可用
3. 把另一本改成：
   - library copy 缺失
   - source 也缺失
4. 刷新 library，确认两本都进入 `待修复书籍`
5. 点击 queue header 上的 `批量修复副本`
6. 断言：
   - eligible 的那本离开 repair queue，恢复 reader entry
   - manual-only 的那本继续留在 queue
   - notice 明确说明：
     - 自动修好了 1 本
     - 还有 1 本需要手动处理
7. 再直接检查 on-disk library record，确认：
   - repaired 那本没有变成 duplicate
   - 原有 progress 仍然保留

这让这次 bulk action 不只是表面按钮，而是有真正的 desktop persistence evidence。

## 为什么这次切片是合理的

上一刀把 recovery queue 做出来之后，最自然的下一步不是“再补更多 broken states 文案”，而是回答一个更实际的问题：

- 如果现在 queue 里已经堆了几本只缺 library copy 的书，用户是不是还得一条一条点？

这次回答就是：

- 不用
- 但也不假装所有坏条目都能自动修

所以这刀是很标准的 `P0` 收口切片：

- 提高真实可用性
- 不引入新领域
- 不发明第二套 repair contract

## 还没做什么

这次仍然没有做：

- manual relink review surface
- bulk picker-based relink
- queue state 的更长期持久化/分组管理
- 更复杂的冲突处理，比如“选到的是另一本相似书怎么办”

也就是说，这次只是把“能自动修的那部分”先收掉，还没碰更难的 relink conflict layer。

## 你可以学到什么

### 1. bulk action 最怕的是偷偷发明第二套语义

如果批量修复走的是另一套逻辑，单本修和批量修最终就会漂成两个产品。

这次最重要的工程选择不是 header button，而是：

- bulk path 继续复用已有 `importLibraryBooks -> in-place repair` contract

这样后面无论修单本还是修一批，library record 的行为都还是同一套。

### 2. 回归里不要拿同名 fixture 做按 title 更新的 on-disk 操作

这次写回归时踩到的真实 landmine 是：

- `sample-book.txt`
- `sample-book.epub`

它们 title 一样。

而测试 helper 是按 `title` 改 library record 的，所以第二次更新会把第一本也打坏。

正确做法不是怀疑 runtime，而是先检查 fixture identity，再换成真正不同标题的 sample。

## 验证

实际跑过：

```bash
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'bulk repairs eligible broken library copies while leaving manual relink items in the repair queue' --mochaOpts.timeout 240000"
pnpm check
git diff --check
```

结果：

- PASS
