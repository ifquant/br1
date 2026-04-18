# 0235: 给新的 annotation kind filter 补 desktop 证据

这次没有继续扩 reader UI，而是把刚加上的 notes workspace 类型筛选补成真实的 desktop 证据。

## 为什么还要补这一刀

前一刀已经给 notes workspace 加上了：

- `全部类型`
- `高亮`
- `笔记`

也就是说，reader 已经从“能创建高亮和笔记”走到了“能按类型管理高亮和笔记”。

但如果这个能力只在 web smoke 里有证据，还不够。当前 `br1` 的 annotation 真正产品路径还是 desktop reader + host-side store，所以这个管理面必须在 desktop 流里也被锁住，否则它仍然只是一个局部前端行为。

## 这次改了什么

### 1. 扩现有 TXT desktop annotation regression

文件：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

我没有新造一条大回归，而是直接扩现有的：

- `persists txt highlights and notes separately through the desktop reader store`

原因很简单：

- 这条用例已经会创建一条高亮
- 再创建一条笔记
- 关闭重开后确认两者都还在

它天然就是验证 annotation kind filter 的最佳落点。

扩完之后，这条用例会继续验证：

1. 点击 `高亮`
   - notes meta row 显示 `仅看高亮`
   - 列表只剩一张高亮卡片

2. 点击 `笔记`
   - notes meta row 显示 `仅看笔记`
   - 列表只剩一张笔记卡片

3. 点击 `全部类型`
   - notes meta row 回到 `全部类型`
   - 两张卡片重新出现

这意味着：

- filter 不只是前端按钮能点
- 它是在真实 desktop reader store 已有数据的前提下工作
- 并且是在 reopen 之后继续工作的

### 2. 同步更新 feature parity 审计

文件：

- `/Users/dev/workspace2/hc_apps/br1/.planning/FEATURE-PARITY-AUDIT.md`

这里把 annotation 行和详细说明都从：

- “notes workspace 有第一层类型筛选”

推进成：

- “这个筛选现在有 web + desktop 双证据”

这很关键，因为 `FEATURE-PARITY-AUDIT.md` 的职责不是记录“页面看起来像不像”，而是记录“这个 feature 现在有没有可信产品证据”。

## 这刀的意义

这一步虽然没有加新 UI，但它把 annotation 管理面的状态从：

- 有一个新筛选

推进到了：

- 这个新筛选已经走通真实 desktop 主路径

这会让下一步更容易继续往上做，比如：

- 更明确的 highlight management
- desktop 侧更复杂的筛选/聚焦
- 后续单独的 highlights workspace 或 bulk actions

因为现在最小的“类型管理”层已经不只是 web 演示，而是 desktop 产品证据。

## 没做什么

这刀刻意没有碰：

- 新的持久化模型
- highlights 的独立 workspace
- bulk delete / bulk convert
- instant mode
- 更复杂的 annotation 分组或颜色系统

也就是说，它是证据补强，不是下一轮产品扩展。

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
