# 0268: 给 saved highlight selection set 加第一版重命名路径

前面几刀已经把 `saved highlight selection set` 的 reopen 证据补齐到了主要 text-capable desktop formats：

- `TXT`
- `EPUB`
- `FB2`
- `MOBI`
- `AZW3`

这时如果继续只补格式证据，收益就很低了。  
更值钱的是开始把 saved-set 本身往上抬成真正的管理对象。

所以这一刀不再扩格式覆盖，而是补第一条最基本的管理动作：

- `重命名`

## 改了什么

文件：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte`

给已保存选择集新增了：

- `重命名` 按钮

对应行为很直接：

1. 用当前名字预填 `prompt`
2. 用户输入新名字
3. 去空白
4. 如果为空或没改，就不动
5. 否则原位更新这条 saved selection set 的 `name`

因为保存集本来就已经进了 per-book workspace persistence，
所以这里不需要再改 schema，只要更新当前状态对象就能自然落盘。

## 为什么这刀先只锁 `TXT web + EPUB desktop`

因为这一刀验证的是“saved-set 管理能力”本身，不是再证明格式支持面。

`TXT web` 适合锁最轻的 reload 路径：

- 保存
- 重命名
- reload
- 仍然保留新名字

`EPUB desktop` 适合锁最值钱的主 reader 路径：

- 保存
- 重命名
- reopen
- 仍然保留新名字
- 然后继续 `套用 / 删除`

这样证据已经足够说明：

- rename 不是只在当前会话里改 UI 文案
- 它已经进入 web reload 和 desktop reopen 两条真实持久化路径

## 测试覆盖

### TXT web smoke

文件：

- `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`

现在会：

1. 保存 `Web TXT 重点高亮`
2. 点击 `重命名`
3. 改成 `Web TXT 重命名高亮`
4. `reload`
5. 确认新名字还在
6. 继续后面的套用和删除链路

### EPUB desktop regression

文件：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

现在会：

1. 保存 `Desktop EPUB 重点高亮`
2. 点击 `重命名`
3. 改成 `Desktop EPUB 重命名高亮`
4. 关闭 reader window
5. 重开同一本书
6. 确认 saved selection set 面板里保留新名字
7. 再继续 `清空选中 -> 套用 -> 删除`

## 同步文档

文件：

- `/Users/dev/workspace2/hc_apps/br1/.planning/FEATURE-PARITY-AUDIT.md`

总账里现在把这层能力从：

- named saved-selection-set flow

推进成：

- named saved-selection-set flow with rename support

## 验证

- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts --reporter=line` (PASS)
- `bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'persists epub highlights and notes separately through the desktop reader store' --mochaOpts.timeout 180000"` (PASS)
- `pnpm check` (PASS)
- `git diff --check` (PASS)

## 这刀之后的状态

现在 saved selection set 已经不只是：

- 能保存
- 能套用
- 能删除

而是第一次有了：

- 能重命名

下一步如果继续，最自然的上层动作就不再是 rename，而是：

- saved-set ordering
- export
- cross-book workflows

这些才是继续把 saved-set 从“持久化小功能”推进成“真正管理对象”的下一层。
