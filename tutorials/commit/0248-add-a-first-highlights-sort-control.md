# 0248: 给 highlights workspace 加第一版排序控制

这次不是继续补格式证据，而是把 `highlights` workspace 从“能看、能删”推进成“开始能管理顺序”。

## 为什么这刀值得单独做

到 `0247` 为止，`highlights` workspace 已经有了两层基础能力：

- 独立于 mixed notes list 的专门高亮工作区
- 删除当前视图高亮的 bulk action

但它仍然少一个最基础的管理维度：

- 看到的是最近高亮的，还是最早高亮的

如果没有这层排序，workspace 还只是“能看列表”，不是“开始能管理列表”。

## 这次改了什么

文件：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte`

### 1. 新增 highlights 排序状态

我给独立 `highlights` workspace 加了：

- `highlightsSort: 'recent' | 'oldest'`

默认仍然是：

- `recent`

也就是最新创建的高亮优先。

### 2. 高亮列表不再直接用原始顺序

以前 `groupedHighlights` 直接从 `highlightsByScope` 归组。  
现在中间先走一层：

- `sortedHighlights`

排序规则是：

- `recent`: `createdAt` 倒序
- `oldest`: `createdAt` 正序

然后再归组生成 `groupedHighlights`。

这意味着排序不是只改按钮文案，而是实际驱动：

- 组内顺序
- 组出现的先后顺序

### 3. 新增排序控件和状态文案

在 `highlights` workspace 里，我加了：

- `最近添加`
- `最早添加`

同时 meta row 也会显式反映当前视角：

- `最近添加优先`
- `最早添加优先`

所以用户能直接看出当前不是默认顺序，而是一个明确的管理模式。

## 为什么只先在 TXT 路径上锁证据

这刀验证的是“排序管理是否真实可用”，不是继续扩格式覆盖。

`TXT` 仍然是最稳定的 annotation fixture：

- 选区可控
- 不受 reflow 和章节边界影响
- 容易可靠地产生两条高亮和一条笔记

所以这次我把 `TXT` 场景从原来的：

- `1 高亮 + 1 笔记`

升级成了：

- `2 高亮 + 1 笔记`

这样排序才有真实意义。

## 这次怎么验证排序真的生效

### Web smoke

文件：

- `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`

现在 `TXT` web smoke 会：

1. 创建第一条高亮
2. 创建第二条高亮
3. 创建一条笔记
4. 进入独立 `高亮` tab
5. 先验证默认是 `最近添加优先`
6. 断言第一张卡片是第二条高亮
7. 切到 `最早添加`
8. 断言第一张卡片变成第一条高亮
9. 再切回 `最近添加`
10. 断言顺序恢复

这证明排序不是静态标签，而是实际驱动卡片顺序。

### Desktop TXT regression

文件：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

原来的 `TXT` desktop annotation regression 也同步升级成：

- `2 高亮 + 1 笔记`

并在 reopen 后继续验证：

1. `highlights` workspace 默认 recent-first
2. 切到 `最早添加`
3. 第一张高亮卡片变成最早创建的那条
4. 再切回 `最近添加`
5. 第一张高亮卡片重新变成最近创建的那条
6. 然后继续执行 bulk delete
7. 确认只删高亮，不误删笔记

这样这一刀既验证了排序，也没有丢掉上一刀已经锁住的 bulk-delete 闭环。

## 这刀没做什么

这次没有补：

- EPUB / FB2 / Kindle-family 的 sort-control desktop evidence
- highlight 排序持久化
- 章节顺序排序
- multi-select
- export / archive

所以它只是：

- 第一版显式高亮排序控制

不是完整的 highlights management 完成版。

## 验证

本次实际运行：

```bash
pnpm exec playwright test tests/e2e/library-smoke.spec.ts --reporter=line
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'persists txt highlights and notes separately through the desktop reader store' --mochaOpts.timeout 180000"
pnpm check
git diff --check
```

结果：

- `PASS`
- `PASS`
- `PASS`
- `PASS`
