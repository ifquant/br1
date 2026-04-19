# 0270: 给 saved highlight selection set 加第一版导出预览

上一刀把 saved selection set 从“能重命名、能显式排序”推进到了：

- 可以按 `最近保存 / 最早保存` 排序
- 排序会跟着当前书的 highlights workspace 一起持久化

但它仍然还是一个明显的“书内局部状态”：

- 你能保存它
- 能套用它
- 能删掉它
- 但没法把它当成一个明确的数据对象拿出来看

如果下一步要继续往：

- cross-book workflow
- export/import
- 或者更稳定的 review workflow

推进，那 saved set 至少要先有一个结构化的导出面。

所以这一刀先不做 import，
只把 export 做成一个正式可见的工作面：

- 点击 `导出`
- 看到结构化 payload
- 可以复制
- 可以关闭

## 改了什么

### 1. 给 saved set 定义显式导出合同

文件：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/types.ts`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/index.ts`

这次新增了：

- `ReaderHighlightSelectionSetExport`

它不是只吐一个裸的 `selectedIds` 数组，
而是把导出对象明确收成：

- `schemaVersion`
- `bookKey`
- `bookTitle`
- `bookAuthor`
- `formatLabel`
- `exportedAt`
- `selectionSet`

这样后面如果继续做：

- import
- cross-book compare
- export to file

至少已经有一层明确合同，不会再从 UI 临时拼数据。

### 2. 在 highlights sidebar 里做第一版导出预览

文件：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte`

`已保存选择集` 里的每张 card 现在新增了：

- `导出`

点击后不会直接跳系统下载，
而是先在 sidebar 内打开一个：

- `saved highlight selection export preview`

这个预览面会显示：

- 导出对象对应的是哪一个 saved set
- 格式化后的 JSON payload
- `复制导出内容`
- `关闭`

这一步的重点是先把 saved set 从“只能操作的状态”推进成“能被查看的对象”。

同时也补了两个基础行为：

- 如果删除的是当前正在导出的 saved set，导出预览会一起清掉
- 复制动作会写入 clipboard，并在面板里回显成功/失败提示

### 3. 先锁 TXT web + EPUB desktop 两条最值钱的证据

#### TXT web

文件：

- `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`

这次在原来的 renamed + sorted saved-set 链路上继续验证：

1. 点击第一张 saved-set card 的 `导出`
2. 验证 export preview 出现
3. 验证 textarea 里有：
   - `"schemaVersion": 1`
   - `"bookTitle": "Sample TXT Book"`
   - `"name": "Web TXT 重命名高亮"`
4. 点击 `关闭`
5. 验证 export preview 消失

#### EPUB desktop

文件：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

这次在原来的 reopen + oldest-first saved-set 链路上继续验证：

1. 重开同一本 EPUB
2. 确认 `最早保存` 和 saved-set 列表都恢复
3. 点击第一张 saved-set card 的 `导出`
4. 验证 export preview 出现
5. 验证 payload 里有：
   - `"schemaVersion": 1`
   - `"bookTitle": "Sample EPUB Book"`
   - `"name": "Desktop EPUB 重命名高亮"`
6. 点击 `关闭`
7. 验证 export preview 消失

这刀证明的不是“又多一个按钮”，而是：

- saved set 已经能变成结构化对象
- 这个对象在 web 和 desktop 主路径里都能被实际打开查看

## 为什么这刀先不做 import

因为 export/import 最容易一次做散。

当前更值钱的顺序是：

1. 先明确导出合同
2. 再把导出对象做成真实可见工作面
3. 最后再讨论 import、cross-book reuse、file export

如果现在直接把 import 一起塞进来，
很容易把这刀从“对象化 saved set”变成一团混合 patch。

## 同步文档

文件：

- `/Users/dev/workspace2/hc_apps/br1/.planning/FEATURE-PARITY-AUDIT.md`

总账里现在把这层能力从：

- rename + explicit sort

推进成：

- rename + explicit sort + structured export preview

## 验证

- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts --reporter=line` (PASS)
- `bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'persists epub highlights and notes separately through the desktop reader store' --mochaOpts.timeout 180000"` (PASS)
- `cargo check --manifest-path src-tauri/Cargo.toml` (PASS)
- `pnpm check` (PASS)
- `git diff --check` (PASS)

## 这刀之后的状态

现在 saved selection set 已经不只是：

- 能保存
- 能重命名
- 能排序
- 能套用
- 能删除

而且第一次有了：

- 显式导出合同
- 结构化导出预览
- 复制导出内容

下一步如果继续，最自然的上层动作就变成：

- saved-set import
- cross-book workflows
- export to file
- 或者 saved-set 的更高一级组织方式
