# 0239: 给新的 annotation kind filter 补 FB2 desktop 证据

这次把 annotation 管理面的最后一块 secondary text gap 收掉了：`FB2` 现在也有了和 `TXT / EPUB / MOBI / AZW3` 同等级的 desktop kind-filter 证据。

## 为什么这刀要单独做

前几刀已经把 `全部类型 / 高亮 / 笔记` 这层最小管理能力补到了：

- `web`
- `TXT desktop`
- `EPUB desktop`
- `Kindle-family desktop`

但 `FB2` 一直没进这组，不是因为它没有 annotation 能力，而是因为它的 desktop regression 有一个更低层的问题：

- 自动选区有时先抓到书名或章节标题
- notes workspace 不接受这类假正文选区
- 测试就会在真正进入 filter-management 之前失败

上一刀已经先把这个问题拆出来处理，给 helper 增加了显式排除文本，并在 `FB2` regression 里避开标题页文本。这样这一次就可以专心把 `FB2` 的管理层证据补齐，而不再混 selection stability 问题。

## 这次改了什么

### 1. 扩现有 FB2 desktop annotation regression

文件：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

我没有新加另一条 `FB2` regression，而是继续扩现有的：

- `persists FB2 highlights and notes separately through the desktop reader store`

它原来已经会验证：

1. 创建一条高亮
2. 创建一条笔记
3. 落盘
4. reopen 后两条都还在

现在它还会继续验证：

1. 点 `高亮`
   - meta row 进入 `仅看高亮`
   - 列表只剩一条高亮卡片

2. 点 `笔记`
   - meta row 进入 `仅看笔记`
   - 列表只剩一条笔记卡片

3. 点 `全部类型`
   - meta row 回到 `全部类型`
   - 两条 annotation 一起回到列表

这意味着 `FB2` 不再只是“能做 annotation”，而是正式进入了“annotation 可以被管理”的那一层。

### 2. 同步更新 feature parity 审计

文件：

- `/Users/dev/workspace2/hc_apps/br1/.planning/FEATURE-PARITY-AUDIT.md`

这里把 annotation 这一行继续推进成：

- `TXT`
- `EPUB`
- `FB2`
- `Kindle-family`

都已具备 desktop kind-filter 证据。

也就是说，当前 `notes workspace` 这层最小管理面，已经覆盖了主要的 text-capable desktop formats。

## 这刀的意义

到这里，annotation management 这条线的状态已经比之前清楚很多：

- capture 层：
  - `TXT / EPUB / FB2 / MOBI / AZW3` 都有真实 desktop 证据
- management 层：
  - `TXT / EPUB / FB2 / MOBI / AZW3` 现在也都有最小 type-filter 证据

这样下一步如果还要继续，最合理的方向就不再是“继续补这个格式有没有证据”，而是直接进入更高一级的产品面，比如：

- dedicated highlights workspace
- bulk actions
- 更成熟的 highlight management

## 没做什么

这刀仍然没有碰：

- CBZ 这类非正文文本格式
- dedicated highlights workspace
- bulk delete / bulk convert
- instant mode
- 更复杂的 annotation taxonomy

也就是说，它只是把现有的最小管理层证据补齐，不是新一阶段的产品设计。

## 验证

本次实际运行：

```bash
pnpm check
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'persists FB2 highlights and notes separately through the desktop reader store' --mochaOpts.timeout 120000"
git diff --check
```

结果：

- `PASS`
- `PASS`
- `PASS`
