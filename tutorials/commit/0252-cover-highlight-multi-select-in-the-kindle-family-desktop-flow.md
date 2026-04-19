# 0252: 给 highlights multi-select 补 Kindle-family desktop 主路径证据

这次没有继续扩新功能，而是把上一刀已经落到 `TXT / EPUB / FB2` 的 `highlights` multi-select 删除路径，继续推进到了 shared `MOBI / AZW3` desktop reader 回归里。

## 为什么这刀值得单独补

到 `0251` 为止，这条能力已经能证明：

- `TXT` 上能选中部分高亮再删除
- `EPUB` 主路径也能做同样的事
- `FB2` 这个 secondary-format 也已经跟上

但 Kindle-family 还是一个明显缺口：

- `MOBI`
- `AZW3`

这两条路径虽然已经有 `highlight / note split`、独立 `高亮` workspace、以及 bulk delete 的 desktop 证据，但还没有证明：

- 先种出两条高亮
- 按排序选中其中一条
- 只删掉这条被选中的高亮
- 最后再清掉剩余高亮

如果这一步不补，当前的 multi-select 管理层就还是偏向 `TXT / EPUB / FB2` 的局部证据，不够说明它已经进了 Kindle-family 主路径。

## 这次改了什么

文件：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`
- `/Users/dev/workspace2/hc_apps/br1/.planning/FEATURE-PARITY-AUDIT.md`

我继续扩现有的：

- `persists MOBI and AZW3 highlights and notes separately through the desktop reader store`

### 1. 把 shared Kindle-family 场景从 `1 高亮 + 1 笔记` 升级成 `2 高亮 + 1 笔记`

和前两刀在 `EPUB / FB2` 上做的一样，这次 `MOBI / AZW3` 共享回归也改成：

1. 第一段正文做高亮
2. 第二段正文再做一条高亮
3. 第三段正文再记一条笔记

这样后面的 partial delete 才是真动作，而不是“只有一条高亮时删光它”。

### 2. 在独立 highlights workspace 里验证 oldest-first + partial delete

reopen 后，这条 regression 现在会继续：

1. 进入 `高亮` tab
2. 确认当前有两条高亮，不混入 note body
3. 切到 `最早添加`
4. 断言第一张卡片变成最早那条高亮
5. 选中这一条最早高亮
6. 执行 `删除选中高亮`
7. 断言：
   - 只剩一条高亮
   - 留下的是另一条高亮
   - 选中状态清空

### 3. 保留已有的 bulk delete 收尾

为了不丢掉前面已经锁住的契约，这条 shared Kindle-family 线最后仍然会：

1. 切回 `最近添加`
2. 执行 `删除当前视图高亮`
3. 回到 `笔记`
4. 断言：
   - `0 高亮`
   - `1 笔记`
   - note body 仍然存在

所以 `MOBI / AZW3` 现在也有了完整的三层闭环：

- highlights / notes split
- partial-selection delete
- visible bulk delete

## 审计表同步了什么

`FEATURE-PARITY-AUDIT.md` 这次只同步改了一件事：

- `Annotations and Highlighting` 现在不再写成 partial-selection delete 只有 `web + desktop TXT + desktop EPUB + desktop FB2`
- 而是明确更新成：
  - `web + desktop TXT + desktop EPUB + desktop FB2 + desktop Kindle-family`

这能让功能总账和当前回归证据保持一致，不会出现代码已经补齐，但审计表还停在旧范围的问题。

## 这刀没做什么

这次没有补：

- selection persistence
- inverse selection
- export / archive
- 新的产品控件

所以它只是：

- 把已有的 multi-select 管理路径推进到 Kindle-family desktop 主路径

不是新一轮产品面扩张。

## 验证

本次实际运行：

```bash
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'persists MOBI and AZW3 highlights and notes separately through the desktop reader store' --mochaOpts.timeout 240000"
pnpm check
git diff --check
```

结果：

- `PASS`
- `PASS`
- `PASS`
