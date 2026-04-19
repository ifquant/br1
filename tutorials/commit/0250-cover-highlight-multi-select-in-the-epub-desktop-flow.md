# 0250: 给 highlights multi-select 补 EPUB desktop 主路径证据

这次没有继续扩新功能，而是把上一刀刚做出来的 `highlights` multi-select 删除路径，从 `TXT` 的稳定样本推进到了真正的 `EPUB` desktop 主路径。

## 为什么这刀值得单独补

`0249` 已经证明：

- `highlights` workspace 可以选中部分高亮
- 只删选中的那一部分
- 然后再清掉当前视图剩余高亮

但那条证据还只停在 `TXT`。

如果不把它推进到真正的 reflowable `EPUB` 主路径，这层能力仍然更像：

- plain-text management 特例

而不是：

- reader annotation 管理面的真实能力

所以这刀的目标很明确：

- 把同一条 multi-select 管理链，补进 `EPUB` desktop regression

## 这次改了什么

文件：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

我没有新开一条 regression，而是继续扩原来的：

- `persists epub highlights and notes separately through the desktop reader store`

### 1. 把 EPUB 场景从 `1 高亮 + 1 笔记` 升级成 `2 高亮 + 1 笔记`

原来这条 regression 只会：

1. 第一段正文做高亮
2. 第二段正文记笔记

这次我把它改成：

1. 第一段正文做高亮
2. 第二段正文再做一条高亮
3. 第三段正文再记笔记

这样后面的 multi-select 删除才有真实意义。

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

### 3. 最后仍保留整屏 bulk delete 收尾

为了不丢掉上一层已经锁住的契约，这条 regression 最后还会：

1. 切回 recent-first
2. 执行 `删除当前视图高亮`
3. 回到 `笔记`
4. 断言：
   - `0 高亮`
   - `1 笔记`
   - `desktop epub note body` 仍然存在

所以这条线现在同时锁住了三层行为：

- notes/highlights split
- partial-selection delete
- visible bulk delete

## 为什么这刀只先补 EPUB

因为 `EPUB` 是真正的主阅读路径。

相比直接一口气把 `FB2/MOBI/AZW3` 全补上，先拿下 `EPUB` 更值钱：

- 它更接近真实主产品路径
- 它能证明 multi-select 不是 TXT 特例
- 它能把这层管理能力带进真正的 reflowable reader 主舞台

## 这刀没做什么

这次没有补：

- `FB2` multi-select desktop regression
- `MOBI/AZW3` multi-select desktop regression
- selection persistence
- inverse selection
- export / archive

所以这只是：

- multi-select evidence 进入 `EPUB` desktop 主路径

不是完整的跨格式 selection management 收口。

## 验证

本次实际运行：

```bash
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'persists epub highlights and notes separately through the desktop reader store' --mochaOpts.timeout 180000"
pnpm check
git diff --check
```

结果：

- `PASS`
- `PASS`
- `PASS`
