# 0247: 给 highlights bulk delete 补主要 desktop reader 证据

这次没有继续扩产品功能，而是把上一刀只在 `TXT` 上锁住的 bulk delete 证据，一次扩到了主要 text-capable desktop reader 路径。

## 为什么这刀要合并推进

`0246` 已经证明：

- `highlights` workspace 可以在 desktop `TXT` 路径里删掉当前视图高亮
- 删高亮不会误删已持久化的笔记

但如果只停在 `TXT`，这个 bulk delete 仍然更像“plain text 特例”，而不是 reader annotation 管理面的真实能力。

所以这刀直接把同一层证据补到：

- `EPUB`
- `FB2`
- `MOBI`
- `AZW3`

这样最小结论才成立：

- bulk delete 不是单一路径巧合
- 它已经跨主要 text-capable desktop readers 可验证

## 这次改了什么

文件：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

### 1. 先抽一个共享 bulk-delete helper

我没有在每条 regression 里重复拼：

- 找 `highlights panel preview`
- stub `window.confirm`
- 找 `删除当前视图高亮`
- 点击按钮

而是先抽成一个 helper：

- `bulkDeleteVisibleHighlightsInWorkspace()`

这样后面每条 desktop 回归都走同一套 bulk-delete 动作，不会把测试行为写散。

### 2. 扩 EPUB desktop annotation regression

原来的 `EPUB` regression 已经会验证：

1. 高亮 + 笔记持久化
2. reopen 后仍然存在
3. `全部类型 / 高亮 / 笔记`
4. 独立 `高亮` tab 只显示高亮

这次继续补：

1. 在 `高亮` tab 执行 bulk delete
2. 断言 highlights workspace 进入空态
3. 回到 `笔记`
4. 断言：
   - `0 高亮`
   - `1 笔记`
   - `desktop epub note body` 仍然存在

### 3. 扩 Kindle-family desktop annotation regression

`MOBI/AZW3` 这条 regression 原来是循环跑两个格式。

这次我直接在每个格式的 reopen 后继续补同样的 bulk-delete 断言：

1. 进入 `高亮` tab
2. 删除当前视图高亮
3. 确认空态
4. 切回 `笔记`
5. 确认对应的 note body 还在

这样 `MOBI` 和 `AZW3` 两个格式都拿到了同级别证据。

### 4. 扩 FB2 desktop annotation regression

`FB2` 这条线也补了相同闭环：

1. 独立 highlights workspace 只剩高亮
2. bulk delete
3. highlights 空态
4. notes workspace 仍然保留 `desktop fb2 note body`

## 这刀真正锁住了什么

现在第一版 bulk delete 不再只是：

- web 有
- TXT desktop 有

而是已经能说：

- web 有
- TXT / EPUB / FB2 / MOBI / AZW3 的 desktop reader 主路径都有

也就是：

- 删除的是当前视图高亮
- 不误删笔记
- 删除结果会同步反映到 notes workspace 的计数和内容

## 这刀没做什么

这次没有补：

- `CBZ` 非正文格式的 bulk delete
- highlight 排序
- multi-select
- export / archive
- 更高一级的 highlights workspace 管理

所以这仍然只是“第一版 bulk delete 的跨主要格式 desktop evidence”，不是完整的 highlight management 完成。

## 验证

本次实际运行：

```bash
pnpm check
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'persists epub highlights and notes separately through the desktop reader store|persists MOBI and AZW3 highlights and notes separately through the desktop reader store|persists FB2 highlights and notes separately through the desktop reader store' --mochaOpts.timeout 240000"
git diff --check
```

结果：

- `PASS`
- `PASS`
- `PASS`
