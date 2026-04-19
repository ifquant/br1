# 0262: 把 FB2 的高亮选择集持久化证据补到重开链路

这一刀延续上一轮的方向，但范围继续保持很窄：

- 不改 `highlights` 持久化实现
- 不碰 Kindle-family
- 只把 per-book highlights workspace 的 reopen 证据，从 `EPUB` 继续推进到 `FB2`

## 为什么这刀现在值得做

上一轮已经证明：

- `TXT web`
- `TXT desktop reopen`
- `EPUB desktop reopen`

都能恢复每本书自己的：

- `selected-only` 过滤状态
- `oldest-first` 排序状态
- 当前选择集

接下来最自然的不是重新折腾实现，而是继续往 secondary formats 扩证据。  
`FB2` 是其中最直接的一条，因为它已经有完整的 desktop annotation 主路径，只差 reopen 这一格。

## 改了什么

### 1. 给 FB2 desktop regression 补上 reopen 后的工作面恢复断言

文件：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

原来的 `FB2` desktop annotation regression 已经会覆盖：

- 两条高亮 + 一条笔记
- notes workspace 的 kind filter
- highlights workspace 的排序
- selected-only 视图
- invert / delete / group delete

但它还没有真正跨一次：

- 关闭 reader window
- 从 library 重新打开同一本 `FB2`

去验证 `highlights` 工作面状态是否回来。

现在补上的步骤是：

1. 在 `FB2` 的 `highlights` tab 里先把状态收成：
   - `最早添加`
   - `已选高亮`
   - 只剩 1 条被选中的最早高亮
2. 关闭 reader window
3. 从 library 重新打开同一本 `FB2`
4. 再进入 `高亮` tab
5. 断言恢复后的工作面仍然是：
   - `1 已选高亮`
   - `最早添加优先`
   - 仍然是原来那条最早高亮

这让 per-book highlights selection persistence 不再只停在 `TXT + EPUB`。

### 2. 同步更新功能总账

文件：

- `/Users/dev/workspace2/hc_apps/br1/.planning/FEATURE-PARITY-AUDIT.md`

这里把 annotation/highlighting 那条里的证据范围从：

- `web TXT + desktop TXT + desktop EPUB`

更新成：

- `web TXT + desktop TXT + desktop EPUB + desktop FB2`

这样 planning 总账和真实 regression 面保持一致。

## 为什么这刀仍然不改运行时代码

因为这条能力的实现上一轮已经落下：

- sidebar 会按 `bookKey` 落盘
- desktop 走 host-side persistence
- `TXT` 和 `EPUB` 都已经证明它不是格式特例

所以这刀最值钱的是继续把 evidence surface 扩到 next-adjacent format。  
`FB2` 通过以后，我们才能更有底气说这条 per-book highlights workspace contract 已经开始跨 secondary formats 成立。

## 验证

- `bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'persists FB2 highlights and notes separately through the desktop reader store' --mochaOpts.timeout 180000"` (PASS)
- `pnpm check` (PASS)
- `git diff --check` (PASS)

## 这刀之后的状态

现在 per-book highlights selection persistence 的证据范围是：

- `TXT web`
- `TXT desktop reopen`
- `EPUB desktop reopen`
- `FB2 desktop reopen`

接下来最自然的下一刀就是：

- `MOBI / AZW3` 的 reopen persistence

这样这条工作面状态恢复契约才算真正跨到了 Kindle-family。
