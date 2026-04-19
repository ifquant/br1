# 0271: 给 saved highlight selection set 加第一版同书导入路径

上一刀把 saved selection set 从“能导出预览”推进到了：

- 能看到结构化 payload
- 能复制导出内容

但它还只是一个单向出口：

- 你能把它拿出来
- 但不能再把它带回工作面

如果下一步要继续走：

- import
- cross-book workflow
- export/import round-trip

那就不能一直停在“只导出，不导入”。

所以这一刀先补最小、最诚实的一步：

- 只支持把导出的 JSON 重新导回当前这一本书

不假装已经支持：

- 跨书复用
- 跨格式复用
- 或者 locator-level remap

## 改了什么

### 1. 给 saved set 补第一版 import 校验

文件：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte`

这次新增了 `导入` 动作，走的是一个很明确的边界：

1. 用户粘贴导出的 JSON
2. 解析并校验：
   - `schemaVersion === 1`
   - `selectionSet` 结构完整
   - `bookKey` 必须等于当前书
3. 只保留当前书里真实存在的高亮 id
4. 如果一条都对不上，就拒绝导入

这一步的关键不是“先把 import 做出来”，
而是先把产品边界说死：

- 当前只支持同一本书的 saved-set round-trip

### 2. 导入结果进入现有 saved-set 工作面

导入成功后不会走单独的数据通道，
而是直接进入现在的 saved set 列表：

- 参与现有的排序
- 能继续套用
- 能重命名
- 能删除

如果名称冲突，会自动补后缀，
避免直接覆盖已有 saved set。

同时，这次也补了一层显式 notice：

- 导入成功
- JSON 结构错误
- 不是当前书
- 当前书里找不到这些高亮

这样这条路径不再是静默失败。

### 3. 先锁 TXT web + EPUB desktop 两条最值钱的 round-trip 证据

#### TXT web

文件：

- `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`

这次把原来的 saved-set 管理链路升级成：

1. 导出第一组 saved set
2. 删除第一组
3. 点击 `导入`
4. 粘贴刚才导出的 payload
5. 验证：
   - 导入成功 notice 出现
   - 第一张 card 回来
   - 还能继续 `套用`

#### EPUB desktop

文件：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

这次把 `EPUB` desktop 的 saved-set 链路升级成：

1. 导出 `Desktop EPUB 重命名高亮`
2. 删除它
3. 通过 `导入` 把 payload 粘回当前书
4. 验证：
   - saved-set 列表里重新出现
   - import notice 出现
   - 后续还能继续走现有管理链路

也就是说，这一刀证明的不是“有一个 prompt”，
而是：

- saved-set export 已经形成真正的 round-trip
- 这条 round-trip 在 web 和 desktop 主路径都成立

## 为什么这刀先不做 cross-book import

因为当前导出的核心仍然是：

- `selectedIds`

这些 id 本质上是当前书里的高亮对象标识，
不是一个可以安全跨书 remap 的 locator 合同。

如果现在直接声称支持 cross-book import，
那就是拿一个没有稳定映射能力的对象去假装产品完成。

这条线后面真要继续，应该补的是：

- 更稳定的 locator / selection contract
- import remap 规则
- cross-book 失败语义

而不是先把按钮做大。

## 同步文档

文件：

- `/Users/dev/workspace2/hc_apps/br1/.planning/FEATURE-PARITY-AUDIT.md`

总账里现在把这层能力从：

- rename + explicit sort + export preview

推进成：

- rename + explicit sort + structured export preview + same-book import

## 验证

- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts --reporter=line` (PASS)
- `bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'persists epub highlights and notes separately through the desktop reader store' --mochaOpts.timeout 180000"` (PASS)
- `pnpm check` (PASS)
- `git diff --check` (PASS)

## 这刀之后的状态

现在 saved selection set 已经不只是：

- 能保存
- 能重命名
- 能排序
- 能导出

而且第一次有了：

- 同书 round-trip import
- 明确失败语义
- 导入后直接回到现有管理面

下一步如果继续，最自然的上层动作就变成：

- stable locator-based import
- cross-book workflows
- export to file
- 或者 saved-set 的更高一级组织和共享方式
