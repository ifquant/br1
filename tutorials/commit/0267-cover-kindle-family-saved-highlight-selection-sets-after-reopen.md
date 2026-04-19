# 0267: 给 Kindle-family desktop highlights 补已保存选择集的 reopen 证据

前面几刀已经把 `saved highlight selection set` 的 reopen 证据推进到了：

- `TXT web`
- `TXT desktop`
- `EPUB desktop`
- `FB2 desktop`

这一刀补最后一块当前最值钱的 text-capable secondary-format 主路径：

- Kindle-family desktop
  - `MOBI`
  - `AZW3`

这里仍然不扩 runtime 功能，只补 shared desktop regression。

## 改了什么

文件：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

在现有的 shared regression：

- `persists MOBI and AZW3 highlights and notes separately through the desktop reader store`

里，把和 `EPUB/FB2` 同级的 saved selection set 链路接了进去。

现在 `MOBI` 和 `AZW3` 都会走这条顺序：

1. 在 `高亮` tab 里收成：
   - `最早添加`
   - `已选高亮`
   - `1 条已选`
2. 保存为：
   - `Desktop MOBI 重点高亮`
   - 或 `Desktop AZW3 重点高亮`
3. 关闭 reader window
4. 从 library 重开同一本书
5. 确认：
   - `selected-only` 视图恢复
   - `最早添加` 排序恢复
   - saved selection set 面板仍然存在
6. 切回 `全部`
7. `清空选中`
8. 从 saved selection set 面板点击 `套用`
9. 确认重新回到 `1 已选高亮`
10. 删除这个 saved selection set

所以这刀证明的是：

- Kindle-family desktop highlights 也已经接入 named selection set
- 它能跨窗口关闭 / 重开存活
- 能重新套用成 live selection
- 能被删除

## 为什么这刀值钱

到这里，当前主要 text-capable desktop formats 上，
同一层级的 saved selection set reopen 管理链终于齐了：

- `TXT`
- `EPUB`
- `FB2`
- `MOBI`
- `AZW3`

这样后面再继续往上推 selection-management，
就不再需要反复补“这套能力到底在哪些主格式上成立”。

## 同步文档

文件：

- `/Users/dev/workspace2/hc_apps/br1/.planning/FEATURE-PARITY-AUDIT.md`

总账里关于 annotation/highlights 的描述，
已经把 named saved-selection-set flow 更新成：

- `web TXT + desktop TXT + desktop EPUB + desktop FB2 + desktop Kindle-family`

## 验证

- `bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'persists MOBI and AZW3 highlights and notes separately through the desktop reader store' --mochaOpts.timeout 180000"` (PASS)
- `pnpm check` (PASS)
- `git diff --check` (PASS)

## 这刀之后的状态

现在 named saved selection set 的 reopen 证据已经覆盖了当前主要 text-capable desktop formats。

下一步如果继续，就不该再补同等级的格式证据了。  
更值钱的是开始往上做：

- saved selection set rename / ordering
- export
- cross-book workflows
- 更高一级的 selection-management 产品面
