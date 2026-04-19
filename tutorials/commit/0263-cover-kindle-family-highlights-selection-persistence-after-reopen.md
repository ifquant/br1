# 0263: 把 Kindle-family 的高亮选择集持久化证据补到重开链路

这一刀继续沿着上一轮的同一条主线推进：

- 不改 `highlights` 持久化实现
- 不再重新折腾 `TXT / EPUB / FB2`
- 只把 per-book highlights workspace 的 reopen 证据补到 `MOBI / AZW3`

## 为什么现在该做这刀

到上一轮为止，per-book highlights workspace 的恢复证据已经有：

- `TXT web`
- `TXT desktop reopen`
- `EPUB desktop reopen`
- `FB2 desktop reopen`

还剩下最自然、也最值钱的邻近缺口：

- `Kindle-family` 的 desktop reopen

因为 `MOBI / AZW3` 已经有完整的 desktop annotation 主路径，如果不把这条 reopen 证据补上，那么 per-book selection persistence 还不能算真正跨到 Kindle-family。

## 改了什么

### 1. 给共享的 MOBI/AZW3 desktop regression 补上 reopen persistence 断言

文件：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

这组 shared regression 本来已经会验证：

- 两条高亮 + 一条笔记
- notes workspace 的 kind filter
- highlights workspace 的排序
- selected-only 视图
- invert / delete / bulk delete

但它之前还没有真正跨一次：

- 关闭 reader window
- 从 library 重新打开同一本 `MOBI` 或 `AZW3`

去验证 highlights 工作面是否恢复。

现在补上的步骤是：

1. 在 `MOBI/AZW3` 的 `高亮` tab 中先收成：
   - `最早添加`
   - `已选高亮`
   - 只剩 1 条被选中的最早高亮
2. 关闭 reader window
3. 从 library 重新打开同一本书
4. 再进入 `高亮` tab
5. 断言恢复后的工作面仍然是：
   - `1 已选高亮`
   - `最早添加优先`
   - 卡片仍然是原来那条最早高亮

这让 per-book highlights selection persistence 终于覆盖到了 Kindle-family。

### 2. 更新功能总账

文件：

- `/Users/dev/workspace2/hc_apps/br1/.planning/FEATURE-PARITY-AUDIT.md`

这里把 annotation/highlighting 那条里的证据范围继续扩成：

- `web TXT + desktop TXT + desktop EPUB + desktop FB2 + desktop Kindle-family`

保持 planning 总账和真实 regression 面一致。

## 为什么这刀依然不改运行时代码

因为这条能力的实现已经在更早的 slice 里落下了：

- sidebar 会按 `bookKey` 落盘工作面状态
- desktop 走 host-side persistence
- `TXT / EPUB / FB2` 都已证明 reopen 恢复成立

所以这刀的价值不在“再写一套实现”，而在把证据链补齐到最后一个重要文本格式家族。  
通过这条回归之后，我们才能说：

- per-book highlights workspace selection persistence  
  已经覆盖了当前主要 text-capable desktop formats

## 验证

- `bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'persists MOBI and AZW3 highlights and notes separately through the desktop reader store' --mochaOpts.timeout 180000"` (PASS)
- `pnpm check` (PASS)
- `git diff --check` (PASS)

## 这刀之后的状态

现在 per-book highlights selection persistence 的证据范围是：

- `TXT web`
- `TXT desktop reopen`
- `EPUB desktop reopen`
- `FB2 desktop reopen`
- `Kindle-family desktop reopen`

到这里，这条工作面状态恢复契约已经覆盖了当前主要 text-capable desktop formats。  
下一步如果继续，就不该再补同等级格式证据，而应该开始做更高一级的 selection management 或 persistence 产品面。
