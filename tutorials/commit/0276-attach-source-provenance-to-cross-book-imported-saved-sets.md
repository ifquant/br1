# 0276: 给 cross-book imported saved set 挂上来源 provenance

上一刀把 cross-book preview 推进成了第一条真实导入路径：

- preview 里已经能导入当前书可匹配到的 subset

但这条路径还有一个很现实的问题：

- 一旦导进来
- 这个 saved set 在列表里看起来就和本书自己建的那组没区别

这会马上带来两个产品问题：

1. 用户分不清它是不是 foreign-book partial import
2. 后面要继续做 rename/export/reapply 时，缺少来源上下文

所以这一刀先不继续扩 remap 算法，
而是先把 provenance 挂到对象上。

## 改了什么

### 1. saved selection set 现在允许带 `importSource`

文件：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/types.ts`

`ReaderHighlightSelectionSet` 现在新增了可选的：

- `importSource`

它会记录：

- `bookTitle`
- `formatLabel`
- `matchedCount`
- `totalCount`
- `importedAt`

这一步不是为了堆字段，
而是为了让 cross-book imported subset 真正变成一个有来历的对象。

### 2. hydrate / persist 路径都接受这层 provenance

文件：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte`

sidebar 现在在恢复 persisted workspace state 时，也会把这层 `importSource` 读回来。

这意味着 provenance 不是一次性 UI 文案，
而是 saved-set 本身的一部分。

### 3. cross-book imported subset card 现在会显式显示来源

同一个文件里，
saved selection card 现在会在已有：

- 名称
- 高亮数
- 时间

之外，再显示一条来源信息：

- `跨书导入 · <source book> · <matched>/<total>`

这样用户在管理 saved sets 时，
已经能一眼分清：

- 哪些是本书原生创建
- 哪些是 foreign-book partial import

### 4. TXT web + EPUB desktop 都补了 provenance 证据

#### TXT web

文件：

- `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`

这次不只验证跨书 subset 能导进来，
还继续断言第一张 imported card 里明确出现：

- `跨书导入 · Other TXT Book · 1/1`

#### EPUB desktop

文件：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

desktop 这边也同步收口成：

- subset import 成功
- imported card 文案里带来源书和覆盖率

所以这刀证明的是：

- cross-book subset import 不再是匿名对象
- provenance 已经进入 saved-set 管理面本身

## 为什么这刀先做 provenance，而不是继续扩 remap

因为现在更缺的不是“再多匹配一点”，
而是：

- 导进来的对象到底是什么
- 后续管理时能不能被人类理解

没有 provenance，
cross-book subset import 很快就会变成一堆 indistinguishable saved sets。

所以这刀先把“对象是谁”讲清楚，
比继续堆 remap 算法更值钱。

## 同步文档

文件：

- `/Users/dev/workspace2/hc_apps/br1/.planning/FEATURE-PARITY-AUDIT.md`

总账里现在把这层能力从：

- matched-subset import path

推进成：

- matched-subset import with visible source provenance

## 验证

- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts --reporter=line` (PASS)
- `bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'persists epub highlights and notes separately through the desktop reader store' --mochaOpts.timeout 180000"` (PASS)
- `pnpm check` (PASS)
- `git diff --check` (PASS)

## 这刀之后的状态

现在 cross-book imported subset 已经不只是：

- 能导进来

而且第一次有了：

- 明确来源书
- 明确匹配覆盖率
- persisted provenance

下一步如果继续，最自然的上层动作就变成：

- provenance-aware rename/export
- 更完整的 foreign-book remap
- 或者 file-based cross-book workflow
