# 0272: 给 saved highlight selection set 加 locator-backed import recovery

上一刀把 saved selection set 从“只能同书导入”推进到了：

- 能把导出的 JSON 粘回当前书
- 能重新回到现有的 saved-set 管理面

但那条 import 还有一个明显问题：

- 它主要还是靠 `selectedIds`

这意味着只要 highlight id 漂了，
哪怕书还是同一本、内容还是同一段，
saved set 也会因为“id 对不上”而失效。

这对后面继续走：

- 稳定 import
- 更可靠的 reopen / reimport
- 甚至更远一点的 cross-book workflow

都是个明显 blocker。

所以这一刀先不做 cross-book，
而是先把 import 从“只吃 id”推进成：

- `id 优先`
- `locator 快照兜底`

## 改了什么

### 1. 导出合同不再只带 selectedIds

文件：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/types.ts`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/index.ts`

`ReaderHighlightSelectionSetExport` 现在除了：

- `selectionSet.selectedIds`

还会额外携带：

- `highlights`

每条快照包含：

- `id`
- `cfi`
- `text`
- `chapterLabel`
- `chapterHref`
- `createdAt`

也就是说，saved-set export 现在第一次带上了“这是哪些高亮”的稳定上下文，
而不是只剩一组内部 id。

### 2. import 先吃 id，缺口再走 locator 快照回找

文件：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte`

导入现在的顺序变成：

1. 先用 `selectedIds` 找当前书里还能直接命中的高亮
2. 如果有缺口，再用导出的 `highlights` 快照做回找
3. 当前这刀的匹配条件是：
   - `cfi`
   - `text`
   - `chapterHref`

这条线仍然没有声称支持 cross-book，
但它已经把“同一本书里 id 漂了就直接失效”的脆弱性补掉了。

### 3. 两条证据都改成“故意打坏 id，只靠快照恢复”

#### TXT web

文件：

- `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`

这次不再把 export payload 原样导回，
而是先把：

- `selectionSet.selectedIds`

改成一个假的 id，
只保留真实的 `highlights` 快照。

然后再导入并验证：

- saved set 能恢复
- 还能继续套用

#### EPUB desktop

文件：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

同样地，这次也把导出的：

- `selectionSet.selectedIds`

故意替换成无效 id，
然后再通过 desktop import 流程把它导回来。

如果这条回归还过，
证明当前 saved-set import 真正依赖的是 locator 快照恢复，
不是“刚好 id 还活着”。

## 为什么这刀先只做 locator-backed same-book recovery

因为这一步解决的是：

- 当前 import 最真实的脆弱点

而不是假装已经有：

- cross-book remap
- cross-format remap
- universal locator contract

现在最值钱的，是先把“同一本书里 id 漂了也能恢复”做实。

这一步做完后，
后面再谈 cross-book，
才有一个更像样的基础。

## 同步文档

文件：

- `/Users/dev/workspace2/hc_apps/br1/.planning/FEATURE-PARITY-AUDIT.md`

总账里现在把这层能力从：

- same-book import

推进成：

- locator-backed same-book import

## 验证

- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts --reporter=line` (PASS)
- `bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'persists epub highlights and notes separately through the desktop reader store' --mochaOpts.timeout 180000"` (PASS)
- `pnpm check` (PASS)
- `git diff --check` (PASS)

## 这刀之后的状态

现在 saved selection set 已经不只是：

- 能导出
- 能同书导回

而且第一次有了：

- highlight locator 快照
- id 失效时的同书恢复能力

下一步如果继续，最自然的上层动作就变成：

- 更稳定的 locator contract
- cross-book workflow
- 或者更正式的 export/import 文件化路径
