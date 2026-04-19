# 0266: 给 FB2 desktop highlights 补已保存选择集的 reopen 证据

上一刀已经把 `saved highlight selection set` 的 reopen 证据推进到了：

- `TXT web`
- `TXT desktop`
- `EPUB desktop`

这已经说明这套管理面不只是在 plain-text surface 上成立，
也已经进入了主 `EPUB` reader 路径。

这一刀继续往前推，但仍然不扩功能面，只补下一条最邻近的 secondary-format 主路径：

- `FB2 desktop`

## 改了什么

文件：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

在现有的 `persists FB2 highlights and notes separately through the desktop reader store` 里，
把和 `EPUB` 同一层级的 saved selection set 链路补齐了。

新增验证顺序：

1. 在 `高亮` tab 里把工作区收成：
   - `最早添加`
   - `已选高亮`
   - `1 条已选`
2. 保存为 `Desktop FB2 重点高亮`
3. 关闭 reader window
4. 从 library 重开同一本 `FB2`
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

- `FB2` 的 desktop highlights 管理面已经接入 named selection set
- 它能跨窗口关闭 / 重开存活
- 能重新套用成 live selection
- 能被删除

## 为什么这一刀还是只补证据

因为这条线现在的主要工作不是再发明新的 selection-management 控件，
而是把已经做出来的管理面从：

- `TXT`
- `EPUB`

继续推进到 secondary formats。

先把 `FB2` 补上，下一步再补 Kindle-family，证据层级才算整齐。

## 同步文档

文件：

- `/Users/dev/workspace2/hc_apps/br1/.planning/FEATURE-PARITY-AUDIT.md`

总账里关于 annotation/highlights 的描述，
已经把 named saved-selection-set flow 更新成：

- `web TXT + desktop TXT + desktop EPUB + desktop FB2`

## 验证

- `bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'persists FB2 highlights and notes separately through the desktop reader store' --mochaOpts.timeout 180000"` (PASS)
- `pnpm check` (PASS)
- `git diff --check` (PASS)

## 这刀之后的状态

现在 named saved selection set 已经有：

- `TXT web`
- `TXT desktop`
- `EPUB desktop`
- `FB2 desktop`

四条证据。

下一步如果继续，最自然的顺序就是：

- Kindle-family desktop

这样这条 reopen 管理链就能在当前主要 text-capable desktop formats 上真正闭环。
