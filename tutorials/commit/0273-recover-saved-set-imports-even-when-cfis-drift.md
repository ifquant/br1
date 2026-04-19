# 0273: 让 saved-set import 在 CFI 漂移时也能恢复

上一刀把 saved-set import 从“只吃 highlight id”推进到了：

- `id` 优先
- locator 快照兜底

但那条 fallback 还偏保守：

- 它还是优先赌 `cfi + chapterHref`

这意味着只要：

- 同一本书
- 同一段高亮正文
- 但 `cfi` 或章节 href 变了

导入还是可能失效。

这对真正长期可用的 import 来说仍然不够硬。

所以这一刀继续收的是：

- 同书导入在 `id` 漂移之后
- 连 `cfi` 也漂了
- 仍然能靠正文锚点恢复

## 改了什么

### 1. import fallback 从 locator 精确匹配推进到正文锚点匹配

文件：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte`

当前导入顺序现在变成：

1. 先吃当前书里还活着的 `selectedIds`
2. 再尝试精确匹配：
   - `cfi`
   - `text`
   - `chapterHref`
3. 如果还对不上，再走正文锚点匹配：
   - 归一化后的 `text`
   - `chapterHref` 或 `chapterLabel`

也就是说，这一刀不再要求：

- 导出时记下来的 `cfi`
- 和当前书里重新生成的 `cfi`

必须完全一样。

### 2. 两条回归都改成“故意打坏 id 和 cfi”

#### TXT web

文件：

- `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`

这次不再只是把：

- `selectionSet.selectedIds`

改坏，

还会把导出快照里的：

- `cfi`
- `chapterHref`

一起改成假的值。

如果导入还能恢复，
说明当前 saved-set import 真正依赖的是正文锚点回找，
不是“刚好 cfi 还活着”。

#### EPUB desktop

文件：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

同样地，这次 `EPUB` desktop 回归也会：

- 打坏 `selectedIds`
- 打坏 `cfi`
- 打坏 `chapterHref`

然后再验证 saved set 仍然能被导回当前书。

这条回归现在证明的是：

- saved-set import 已经能扛住 id drift
- 也能扛住 cfi drift

## 为什么这刀仍然只做 same-book

因为即便现在正文锚点回找更强了，
它也还只是：

- 当前书内的恢复能力

不是：

- 跨书语义映射
- 跨版本内容对齐
- 跨格式 locator remap

这刀解决的是：

- 当前同书 import 最真实的一层脆弱性

不是提前宣称 cross-book 完成。

## 同步文档

文件：

- `/Users/dev/workspace2/hc_apps/br1/.planning/FEATURE-PARITY-AUDIT.md`

总账里现在把这层能力从：

- locator-backed same-book import

推进成：

- survives both id drift and cfi drift

## 验证

- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts --reporter=line` (PASS)
- `bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'persists epub highlights and notes separately through the desktop reader store' --mochaOpts.timeout 180000"` (PASS)
- `pnpm check` (PASS)
- `git diff --check` (PASS)

## 这刀之后的状态

现在 saved selection set 的 import 已经不只是：

- 能同书导回
- 能在 id 漂移时恢复

而且第一次有了：

- `cfi` 漂移后的正文锚点恢复

下一步如果继续，最自然的上层动作就变成：

- 更强的 locator contract
- cross-book workflow
- 或者真正的 file-based import/export
