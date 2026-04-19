# 0261: 把 EPUB 的高亮选择集持久化证据补到重开链路

这一刀没有继续扩 `highlights` 的运行时能力，而是把上一刀刚落下的“按书恢复工作面状态”证据，从 `TXT` 推进到了 `EPUB` desktop 主路径。

## 这刀为什么值得单独做

上一刀已经证明：

- `highlightsFilter`
- `highlightsSort`
- `selectedHighlightIds`

会按 `bookKey` 持久化下来，而且：

- `TXT web reload`
- `TXT desktop reopen`

都能恢复。

但如果这条证据只存在于 `TXT`，它仍然更像是“plain text 特例”，还不能说明主阅读格式已经真正吃到这条契约。

所以这刀的目标很单一：

- 让 `EPUB` desktop regression 也证明  
  `selected-only + oldest-first + selected ids`
  会在关窗重开后回来。

## 改了什么

### 1. 给 EPUB desktop highlights regression 加入 reopen persistence 断言

文件：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

原来的 `EPUB` regression 已经会验证：

- 两条高亮 + 一条笔记能持久化
- `高亮 / 笔记 / 全部类型` 的切换
- `highlights` tab 的排序、组选中、selected-only、invert、bulk delete

但它还没有真正跨一次 reader close/reopen 去验证：

- 当前高亮工作面的筛选状态
- 排序状态
- 选择集状态

现在补上的步骤是：

1. 在 `EPUB` 的 `highlights` tab 里先把状态收成：
   - `最早添加`
   - `已选高亮`
   - 只剩 1 条已选高亮
2. 关闭 reader window
3. 从 library 重新打开同一本 `EPUB`
4. 再进入 `高亮` tab
5. 断言恢复后的工作面仍然是：
   - `1 已选高亮`
   - `最早添加优先`
   - 卡片仍然是原先那条最早高亮

这样这条 per-book state contract 就不再只停在 `TXT`。

### 2. 审计总账同步扩证据范围

文件：

- `/Users/dev/workspace2/hc_apps/br1/.planning/FEATURE-PARITY-AUDIT.md`

这里把 annotation/highlighting 那条里的表述从：

- `web TXT + desktop TXT`

同步更新成：

- `web TXT + desktop TXT + desktop EPUB`

并把正文里“across reloads”收紧成“across reloads and reopens”，避免总账继续落后于实际 regression。

## 为什么这刀没有改运行时代码

因为上一刀真正落下的是实现，这一刀补的是证据。

如果 `EPUB` 这里失败，才说明 per-book highlights workspace persistence 还没有进入主阅读路径。  
但现在这条回归能过，说明：

- host-side per-book persistence 不是 `TXT` 特例
- `EPUB` desktop 也已经真正消费这条契约

所以这刀最值钱的不是继续改实现，而是把 evidence surface 扩到主路径。

## 验证

- `bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'persists epub highlights and notes separately through the desktop reader store' --mochaOpts.timeout 180000"` (PASS)
- `pnpm check` (PASS)
- `git diff --check` (PASS)

## 这刀之后的状态

现在 per-book highlights selection persistence 的证据范围是：

- `TXT web`
- `TXT desktop reopen`
- `EPUB desktop reopen`

还没补到：

- `FB2`
- `MOBI / AZW3`

所以后面如果继续，最自然的下一刀就是把同等级 reopen persistence 再推进到 secondary formats。
