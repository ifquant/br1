# 0243: 给新的 highlights workspace 补 FB2 desktop 证据

这次继续沿同一条 annotation 管理线推进，但 scope 仍然很窄：

- 不改 UI
- 不加新功能
- 只把 `FB2` 这条 desktop 主路径补成和 `TXT / EPUB` 一样的 highlights workspace 证据

## 为什么这一刀不只是“再补一个格式”

`FB2` 和 `TXT / EPUB` 不一样的地方在于：

- 它是 secondary text-capable format
- 选区更容易先落到标题页或章节标题
- 所以它的 regression 稳定性本来就比 `TXT` 更脆

前面已经有两刀先把更低层的问题收掉了：

1. `FB2` 可以稳定创建 highlight 和 note
2. `FB2` 的 `全部类型 / 高亮 / 笔记` filter-management 也已经补过 desktop 证据

所以这次才能只专注在新的 `高亮` tab 上，而不是再次混着修 selection stability。

## 这次改了什么

### 1. 扩现有 `FB2` desktop annotation regression

文件：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

我没有新建另一条 `FB2` regression，而是继续扩现有的：

- `persists FB2 highlights and notes separately through the desktop reader store`

它原来已经会验证：

1. 创建一条高亮
2. 创建一条笔记
3. host-side store 落盘
4. reopen 后两条还在

这次我把它继续补成和 `TXT / EPUB` 同等级的管理层闭环：

1. 先验证 `高亮` kind filter
2. 再验证 `笔记` kind filter
3. 再验证 `全部类型` 恢复
4. 最后切到独立的 `高亮` tab
5. 断言 highlights workspace：
   - 显示 `已保存 1 条高亮`
   - 只剩一张 `.highlight-card`
   - 这张卡保留 reopen 后那条真正的 FB2 highlight 文本
   - 不会把 `desktop fb2 note body` 混回来

这让 `FB2` 不再只是“能做 annotation”，而是进入了和 `TXT / EPUB` 同级的 highlights workspace 证据层。

## 为什么要顺手把 FB2 的 kind filter 也补齐

因为 `FB2` 这条 regression 之前还没有完整补上：

- `全部类型`
- `高亮`
- `笔记`

这层最小管理面。

如果这次只补独立 `高亮` tab，而不先把 `FB2` 的 kind filter 对齐到和其他格式一致，那么这条 regression 自己会出现层级断裂：

- `TXT / EPUB` 是“kind filter + highlights workspace”
- `FB2` 变成“跳过 kind filter，直接看 highlights workspace”

这样证据面反而不整齐。  
所以这次一并收掉，保持几条主路径的 regression 形状一致。

## 没做什么

这次刻意没有做：

- `MOBI/AZW3` highlights workspace desktop 证据
- bulk highlight actions
- dedicated highlights sorting
- highlights workspace 顶层快捷入口

所以它仍然只是把“第一版独立 highlights workspace”的 desktop 证据继续铺到下一条主格式路径，不是新一轮产品扩建。

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
