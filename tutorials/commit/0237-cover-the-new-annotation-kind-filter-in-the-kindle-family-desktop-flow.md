# 0237: 给新的 annotation kind filter 补 Kindle-family desktop 证据

这次继续沿 annotation 管理面推进，但仍然不扩新 UI。目标是把 `全部类型 / 高亮 / 笔记` 这层最小管理能力，从 `TXT` 和 `EPUB` 再推进到 Kindle-family 的 desktop 主路径。

## 为什么这刀值得单独做

前两刀已经把类型筛选补成了：

- `web`
- `TXT desktop`
- `EPUB desktop`

但 `MOBI/AZW3` 仍然只是“能创建高亮和笔记”，还没有证明这层管理面在 secondary reflowable formats 上同样成立。

这会留下一个实际问题：

- annotation capture 在 Kindle-family 路径上有证据
- annotation management 却还像只在主路径上成立

如果继续往更高一级的 highlights workspace 走，这个缺口会让后续判断变得含糊。所以要先把 Kindle-family 的最小管理层证据补齐。

## 改了什么

### 1. 扩现有 MOBI/AZW3 desktop annotation regression

文件：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

我没有新增一条新的 regression，而是继续扩现有的：

- `persists MOBI and AZW3 highlights and notes separately through the desktop reader store`

原来它只验证：

1. 创建一条高亮
2. 创建一条笔记
3. 落盘
4. reopen 后两条都还在

现在它还会继续验证：

1. 点 `高亮`
   - meta row 显示 `仅看高亮`
   - 列表只剩那条高亮

2. 点 `笔记`
   - meta row 显示 `仅看笔记`
   - 列表只剩那条笔记

3. 点 `全部类型`
   - meta row 回到 `全部类型`
   - 两条记录恢复

而且这整套检查会对：

- `MOBI`
- `AZW3`

两种格式分别执行。

### 2. 同步更新 feature parity 审计

文件：

- `/Users/dev/workspace2/hc_apps/br1/.planning/FEATURE-PARITY-AUDIT.md`

这里把 annotation 行和详细结论继续往前推了一格：

- 现在不再只是 `TXT + EPUB`
- 而是 `TXT + EPUB + Kindle-family desktop`

也就是说，当前 notes workspace 的最小管理层已经开始跨主路径和 secondary reflowable formats 成立。

## 这刀的意义

这一步的意义不是“又多了两条测试”，而是把 annotation 管理层从：

- 只在 plain-text + EPUB 主路径上可信

推进到：

- 在 Kindle-family 的 secondary format 上也可信

这会让下一步更清楚：

- 如果要继续补 `FB2`
- 或者开始做单独的 highlights workspace

我们已经不需要再怀疑这层最小 type filter 是不是只在个别路径上成立。

## 为什么这次没碰 FB2

`FB2` 当前还有一个独立的老问题：

- 第一次可见选区偶发会抓到非正文标题文本

它和这次的 filter-management 目标不是一回事。  
如果顺手把它塞进来，这刀就会从“管理面证据补齐”变成“管理面 + FB2 selection stability”混合切片，范围会失真。

所以这里刻意只收：

- `MOBI`
- `AZW3`

把 `FB2` 留给下一刀单独处理更干净。

## 验证

本次实际运行：

```bash
pnpm check
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'persists MOBI and AZW3 highlights and notes separately through the desktop reader store' --mochaOpts.timeout 120000"
git diff --check
```

结果：

- `PASS`
- `PASS`
- `PASS`
