# 0265: 给 EPUB desktop highlights 补已保存选择集的 reopen 证据

上一刀已经把第一版 `saved highlight selection set` 做进了 `highlights` workspace，
但证据只锁在：

- `TXT web`
- `TXT desktop`

这对第一刀是对的，因为当时主要风险在：

- workspace state 扩展
- host-side 持久化兼容
- save / apply / delete 的链路是否成立

但如果停在这里只能说明：

- 这套管理面在最轻的 plain-text surface 上成立

还不能证明它已经进入主 reader 路径。

所以这一刀不再动 runtime，只补 `EPUB desktop` 的 reopen 证据。

## 改了什么

文件：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

在现有的 `persists epub highlights and notes separately through the desktop reader store` 里，
把 `saved selection set` 链路接进了已经存在的 `highlights` 管理流。

新增验证顺序是：

1. 先把 `EPUB` 高亮工作区收成：
   - `最早添加`
   - `已选高亮`
   - `1 条已选`
2. 保存为 `Desktop EPUB 重点高亮`
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

也就是说，这刀证明的不是“按钮能点”，而是：

- `EPUB` 主 reader 路径上的 named selection set
- 能跨窗口关闭 / 重开存活
- 能重新套用成 live selection
- 能被删除

## 为什么这刀不继续扩到 FB2 / Kindle-family

因为这里要先把“saved selection set 已经进入主路径”这件事说死。

`EPUB` 是最值钱的主路径：

- 不是最轻的 `TXT`
- 也不是 secondary-format 变体

先拿 `EPUB` 补上，产品面就从：

- `TXT-only evidence`

变成：

- `TXT + main EPUB desktop evidence`

这样下一步再去补 `FB2` 和 Kindle-family，就不再是在证明“这功能到底算不算成立”，
而是在做覆盖面扩展。

## 同步文档

文件：

- `/Users/dev/workspace2/hc_apps/br1/.planning/FEATURE-PARITY-AUDIT.md`

总账里关于 annotation/highlights 的那一行，
已经把这条能力从：

- `web TXT + desktop TXT`

更新成：

- `web TXT + desktop TXT + desktop EPUB`

## 验证

- `bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'persists epub highlights and notes separately through the desktop reader store' --mochaOpts.timeout 180000"` (PASS)
- `pnpm check` (PASS)
- `git diff --check` (PASS)

## 这刀之后的状态

现在 `saved highlight selection set` 已经不是只在 plain-text surface 上成立了。

它已经有：

- `TXT web`
- `TXT desktop`
- `EPUB desktop`

三条证据。

下一步如果继续，最自然的顺序就是：

1. `FB2 desktop`
2. Kindle-family desktop

而不是先回头再改 `TXT` 那条已经成立的链路。
