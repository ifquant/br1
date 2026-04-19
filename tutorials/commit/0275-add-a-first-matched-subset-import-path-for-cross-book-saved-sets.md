# 0275: 给 cross-book saved-set preview 加第一条 matched-subset import

上一刀把 cross-book saved-set import 从“直接报死错”推进到了：

- 先做兼容预检
- 告诉你当前书能映射多少条
- 展示未匹配正文样本

但它仍然还停在“只能看，不能动”：

- preview 有了
- 但只要来源书不是当前书
- 仍然完全不能把已匹配的部分带进当前书

这让 cross-book workflow 还是停在纯说明层。

所以这一刀继续往前推一小步，但边界仍然很硬：

- 只允许导入预检里已经成功匹配到的那部分高亮
- 不假装整组 foreign-book saved set 都能进来

## 改了什么

### 1. cross-book preview 现在保存真正可导入的 matched subset

文件：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte`

上一刀的 preview 只显示：

- matched count
- unmatched sample

这次把 preview state 本身收成了更像工作对象的结构，
额外保存：

- `selectionName`
- `selectionCreatedAt`
- `importedIds`

这样 preview 不再只是一个说明面板，
而是已经携带了“当前书实际可导入的 subset”。

### 2. 在 preview 里加 `导入已匹配高亮`

当 preview 里 `matchedCount > 0` 时，
现在会显示：

- `导入已匹配高亮`

点击后不会尝试把 foreign-book 全量 saved set 搬进来，
而是只把当前书里已经成功映射的那部分高亮写成一个新的 saved set。

这条新 saved set 会继续走现有管理链：

- 排序
- 套用
- 导出
- 删除

如果名称冲突，也仍然会自动补后缀。

### 3. 两条主路径都验证“preview -> import matched subset”

#### TXT web

文件：

- `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`

这次不再只验证：

- `跨书预检：可映射 x/y`

而是进一步点击：

- `导入已匹配高亮`

然后断言：

- 出现 `已导入跨书选择集：...`
- 新的 saved set card 真正进入列表

#### EPUB desktop

文件：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

desktop 这边也同步升级成：

1. 先喂 foreign-book payload
2. 进入 compatibility preview
3. 点击 `导入已匹配高亮`
4. 验证新的 saved set 进入当前书的 sidebar workspace

所以这刀证明的已经不是“能不能看预检”，
而是：

- cross-book preview 已经能产出第一条真实可用的 subset import

## 为什么这刀仍然不是 full cross-book import

因为现在导入进来的只是：

- 当前书里已经明确匹配到的那部分高亮

而不是：

- foreign-book 整组 selection set
- 或者失败项也能自动 remap

这一步故意保持收缩：

- 先把能信的 subset 导进来
- 剩下的继续保留在 preview 里显式暴露

这比直接做一条不可信的“全导入”要硬得多。

## 同步文档

文件：

- `/Users/dev/workspace2/hc_apps/br1/.planning/FEATURE-PARITY-AUDIT.md`

总账里现在把这层能力从：

- cross-book compatibility-preview layer

推进成：

- cross-book compatibility preview + matched-subset import

## 验证

- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts --reporter=line` (PASS)
- `bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'persists epub highlights and notes separately through the desktop reader store' --mochaOpts.timeout 180000"` (PASS)
- `pnpm check` (PASS)
- `git diff --check` (PASS)

## 这刀之后的状态

现在 cross-book saved-set 这条线已经不只是：

- 能做预检
- 能告诉你哪些不匹配

而且第一次有了：

- 只导入当前书已匹配部分的真实路径

下一步如果继续，最自然的上层动作就变成：

- 更完整的 foreign-book remap contract
- preview 里的 partial-apply / rename 策略
- 或者真正的 file-based cross-book workflow
