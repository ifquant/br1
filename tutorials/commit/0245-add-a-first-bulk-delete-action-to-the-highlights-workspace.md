# 0245: 给 highlights workspace 补第一版批量删除动作

这次不再继续铺格式证据，而是开始把独立 `highlights` workspace 往真正的管理面推进一小步。

## 为什么下一刀选 bulk delete

到 `0244` 为止，第一版 `highlights` workspace 已经有了完整的证据链：

- web `TXT`
- desktop `TXT`
- desktop `EPUB`
- desktop `FB2`
- desktop `Kindle-family`

也就是说，“这个 workspace 是否成立”已经不再是主要问题。  
下一步更值钱的是让它开始像一个真正的管理面，而不只是“另一张只读列表”。

在这层里，最小又最有价值的动作不是再加一个筛选，而是：

- 能按当前视图一次清掉可见高亮

这比继续加局部控件更像真实产品能力，而且 scope 仍然很可控。

## 这次改了什么

### 1. `highlights` workspace 新增批量删除当前视图高亮

文件：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte`

我新增了一个很小的 helper：

- `deleteVisibleHighlights()`

它的行为很直接：

1. 取当前 `highlightsByScope`
2. 弹一次确认框
3. 对当前可见的每条高亮调用现有的 `onDeleteNote`

也就是说，这次没有新建 bulk-delete API，也没有新建 store action，而是明确复用已有的单条删除契约，把它提升成一个 workspace 级动作。

对应 UI 上，`高亮` tab 现在会在 summary/meta 下面显示：

- `删除当前视图高亮`

如果切到了 `当前章节`，文案会变成：

- `删除当前章节高亮`

这样 bulk action 的语义和当前 scope 是一致的，不会出现“按钮在删什么用户说不清楚”的问题。

### 2. 用现有 TXT web smoke 锁住产品语义

文件：

- `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`

我没有另外新开一条 smoke，而是继续扩现有的 `TXT` annotation flow。

这条用例原来已经会做到：

1. 创建一条高亮
2. 创建一条笔记
3. 验证 kind filter
4. 切到独立 `高亮` tab，确认只剩高亮

现在它还会继续：

1. 在 `高亮` tab 点击 `删除当前视图高亮`
2. 接受确认框
3. 确认 highlights workspace 进入空态
4. 切回 `笔记` tab
5. 确认：
   - `0 高亮`
   - `1 笔记`
   - 笔记卡片还在
6. reload 后继续确认：
   - 笔记仍在
   - 高亮不再回来

这一步很重要，因为它证明的不是“按钮能点”，而是：

- bulk delete 只删高亮，不会误删笔记
- 删除结果会真正持久化

## 为什么这刀仍然小而值钱

如果这次直接做：

- 多选
- 批量导出
- 批量转笔记
- 独立排序

那就已经不是“小步推进 highlight management”，而是另起一个 annotation 子项目了。

这次选 bulk delete 的原因是：

- 行为清楚
- 复用现有删除契约
- 能直接带来真实产品价值
- smoke 很容易锁定正确语义

所以它是一个很好的第一刀。

## 没做什么

这次刻意没有做：

- 多选
- bulk export
- highlight 排序
- highlight 转 note
- desktop-focused bulk-delete regression

也就是说，它只是给独立 highlights workspace 补了第一版 bulk action，不是完整的 highlights management 系统。

## 验证

本次实际运行：

```bash
pnpm check
pnpm exec playwright test tests/e2e/library-smoke.spec.ts --reporter=line
git diff --check
```

结果：

- `PASS`
- `PASS`
- `PASS`
