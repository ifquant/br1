# 0274: 给 saved-set import 加第一版跨书兼容预检

上一刀把 saved-set import 收到了：

- 同书内 id 漂移可恢复
- 同书内 cfi 漂移也可恢复

但它仍然还有一个真实空档：

- 只要 `bookKey` 不同
- 当前行为就只会直接拒绝

这虽然诚实，
但产品上还是太硬：

- 用户不知道为什么不行
- 也不知道当前书到底能映射多少
- 更看不到后面有没有可能推进成真正 cross-book workflow

所以这一刀先不做“跨书直接导入”，
而是先补第一版：

- cross-book compatibility preview

也就是：

- 粘一个别的书导出的 payload
- 先告诉你当前书能映射几条
- 哪些正文完全对不上
- 然后明确阻断真正导入

## 改了什么

### 1. 跨书 payload 不再直接报死错

文件：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte`

现在 `bookKey !== current book` 时，不会再只给一句：

- 当前只支持导入同一本书的选择集

而是会先跑现有的 locator/text-anchor 匹配逻辑，
然后生成一份兼容预检：

- 来源书名
- 来源格式
- 当前书可映射多少 / 总共多少
- 最多 3 条无法映射的正文样本

同时 notice 也改成了更明确的产品语义：

- 这是跨书预检
- 现在还不能直接导入

### 2. 预检结果进入正式工作面

这次不是只打一条 notice，
而是新增了 sidebar 内的预检面板：

- `saved highlight selection import preview`

它会显示：

- `来源：<book> · <format>`
- `当前书可映射 x / y 条高亮`
- 以及未匹配正文样本

这样后面如果真做 cross-book import，
这里已经是自然的前置工作面，
不是再从零造一层 UI。

### 3. 先锁 TXT web + EPUB desktop 两条最值钱的路径

#### TXT web

文件：

- `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`

这次会构造一个：

- `bookKey` 改成别的书
- `highlights.text` 也故意改坏

的 payload，
然后验证：

- 出现 `跨书预检：可映射 0/1 条高亮`
- 预检面板出现
- 来源信息正确
- 未匹配正文样本正确

#### EPUB desktop

文件：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

同样地，`EPUB` desktop 回归也会喂一个：

- foreign `bookKey`
- 无法匹配正文

的 payload，
然后验证 reader 不是直接导入，
而是进入同一套跨书兼容预检面。

## 为什么这刀先只做 preview

因为现在最值钱的不是假装：

- cross-book 已经能导

而是先把两个更重要的东西做实：

1. 当前书到底能映射多少
2. 不匹配的正文到底是什么

没有这层预检，后面真做 cross-book import，
只会把失败语义和产品边界继续往后推。

所以这刀的目标很明确：

- 先把跨书工作流变成一个可见、可解释的问题

不是直接宣布问题已经解决。

## 同步文档

文件：

- `/Users/dev/workspace2/hc_apps/br1/.planning/FEATURE-PARITY-AUDIT.md`

总账里现在把这层能力从：

- survives both id drift and cfi drift

推进成：

- first cross-book compatibility-preview layer

## 验证

- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts --reporter=line` (PASS)
- `bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'persists epub highlights and notes separately through the desktop reader store' --mochaOpts.timeout 180000"` (PASS)
- `pnpm check` (PASS)
- `git diff --check` (PASS)

## 这刀之后的状态

现在 saved-set import 已经不只是：

- 同书恢复更稳

而且第一次有了：

- 跨书兼容预检
- 未匹配正文样本
- 明确的“还不能直接导入”边界

下一步如果继续，最自然的上层动作就变成：

- 真正的 cross-book import contract
- 更稳定的 locator / text-anchor 映射
- 或者 file-based import/export 工作流
