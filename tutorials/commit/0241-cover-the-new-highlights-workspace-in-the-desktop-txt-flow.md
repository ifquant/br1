# 0241: 给新的 highlights workspace 补 TXT desktop 证据

这次不再改 annotation 产品面本身，而是把上一刀刚加出来的 `高亮` workspace 补成真正的 desktop 证据。

## 为什么这刀要单独补

`0240` 已经把 reader sidebar 从：

- 一个混合的 notes list

推进成了：

- `笔记` workspace
- `高亮` workspace

但那一刀的验证只有：

- `pnpm check`
- `library-smoke` 的 web 路径

这还不够。  
因为 `highlights workspace` 真正要站住，至少还得证明一件事：

- 在 desktop host-side store 流里，创建高亮和笔记、关闭、重开之后，独立的 `高亮` tab 仍然只显示高亮，不会把 mixed notes 的内容又混回来

所以这刀的目的很纯：

- 不扩新功能
- 不改 UI
- 只把新 workspace 接进现有 desktop TXT regression

## 这次改了什么

### 1. 抽了一个很小的 sidebar tab helper

文件：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

新增：

- `clickReaderSidebarTab()`

它只负责一件事：

- 在 desktop webdriver 里点击 reader sidebar 的 tab

我没有把它写成大而全的 reader navigation helper，只保留当前这刀需要的最小能力，避免测试工具层开始无节制扩张。

### 2. 扩现有 `TXT` desktop annotation regression

文件：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

我没有新建另一条 TXT regression，而是继续扩原来的：

- `persists txt highlights and notes separately through the desktop reader store`

它原来已经会验证：

1. 创建一条高亮
2. 创建一条笔记
3. 落盘
4. reopen 后两条都还在
5. `全部类型 / 高亮 / 笔记` kind filter 正常工作

现在它还会继续：

1. 点击 sidebar 的 `高亮` tab
2. 断言 `highlights panel preview` 已显示
3. 断言 workspace 文案显示 `已保存 1 条高亮`
4. 断言列表里只剩一张 `.highlight-card`
5. 断言这张卡包含：
   - `高亮`
   - `plain text file exists`
6. 并且明确不包含：
   - `desktop txt note body`

也就是说，这次不是只证明 kind filter 还在，而是证明：

- 新增的独立 highlights workspace 在 desktop flow 里真的成立

## 为什么只先补 TXT

因为 `TXT` 现在是最稳的一条 annotation desktop 路径：

- 选区可控
- fixture 固定
- host-side store 已稳定
- 不涉及 foliate 文档重排和章节页干扰

先把最稳的路径补成 desktop 证据，能最快判断：

- 新 workspace 的行为到底是不是产品级成立

这比一上来就去 `EPUB/FB2/MOBI/AZW3` 全铺开要更稳。

## 没做什么

这刀刻意没有做：

- `EPUB` desktop highlights workspace 回归
- `FB2/MOBI/AZW3` desktop highlights workspace 回归
- header 上新增高亮入口
- bulk actions
- dedicated highlights store

所以它只是把 `0240` 的新 workspace 从：

- web evidence

推进到了：

- web + desktop TXT evidence

而不是继续扩新一轮产品范围。

## 验证

本次实际运行：

```bash
pnpm check
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'persists txt highlights and notes separately through the desktop reader store' --mochaOpts.timeout 120000"
git diff --check
```

结果：

- `PASS`
- `PASS`
- `PASS`
