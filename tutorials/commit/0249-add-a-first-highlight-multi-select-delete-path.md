# 0249: 给 highlights workspace 加第一版多选删除路径

这次继续沿 `highlights` workspace 的管理面往上提，不再只是“全删当前视图”，而是补了一条真正更细粒度的路径：

- 先选中部分高亮
- 再只删选中的那些

## 为什么这刀值得做

到 `0248` 为止，`highlights` workspace 已经有三层基础能力：

- 独立高亮工作区
- 删除当前视图全部高亮
- `最近添加 / 最早添加` 排序

但它还是缺一个明显的管理缺口：

- 不能只删其中几条

只支持“整屏全删”，说明它还是偏浏览器，而不是开始进入真正的管理面。

## 这次改了什么

文件：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte`

### 1. 新增高亮选中状态

我在 `highlights` workspace 里加了：

- `selectedHighlightIds`

并用 reactive prune 保证：

- 当当前可见高亮集合变化时
- 已经不存在的选中项会自动清掉

这样不会留下脏的选中状态。

### 2. 新增第一版多选管理动作

workspace 现在多了三类动作：

- `选中当前视图高亮`
- `清空选中`
- `删除选中高亮`

其中：

- `选中当前视图高亮` 会把当前可见高亮全选
- `删除选中高亮` 只删当前选中的那些
- `删除当前视图高亮` 仍然保留，继续负责整屏清理

也就是说现在同一个工作区里已经有两种不同层级的删除动作：

- view-level bulk delete
- selection-level bulk delete

### 3. 每条高亮卡片新增选中切换

我没有上 checkbox，而是先做最轻的一版：

- `选中`
- `已选`

这个 toggle 就放在每条高亮卡片自己的 action 区里。  
这样能直接让用户从列表里选中某几条高亮，而不需要先切模式。

### 4. meta row 现在会显示选中状态

高亮工作区顶部现在会额外显示：

- `已选 N 条`
- 或 `未选高亮`

这样用户能明确知道：

- 自己是不是已经在 selection mode 里
- 当前删的是“全部可见”还是“选中的那几条”

## 为什么还是先锁 TXT

这刀验证的是“多选删除管理面是否真实可用”，不是继续扩格式覆盖。

`TXT` 仍然是最稳的 annotation fixture：

- 选区最可控
- 可稳定生成两条高亮和一条笔记
- 不受 reflow / chapter 边界影响

所以这次还是用 `TXT` 先把多选删除锁住。

## 这次怎么验证

### Web smoke

文件：

- `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`

现在 `TXT` web smoke 会：

1. 创建两条高亮和一条笔记
2. 验证排序切换仍然生效
3. 切到 `最早添加`
4. 选中最早那条高亮
5. 执行 `删除选中高亮`
6. 验证：
   - 只剩一条高亮
   - 留下的是另一条高亮
   - 笔记没被误删
7. 最后再用 `删除当前视图高亮` 清掉剩余高亮

这样 web 路径已经能证明：

- 多选删除和整屏删除是两条不同动作
- 只删选中的那一部分

### Desktop TXT regression

文件：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

desktop `TXT` regression 现在也会：

1. 创建两条高亮和一条笔记
2. reopen
3. 验证排序切换
4. 切到 `最早添加`
5. 选中最早那条高亮
6. 执行 `删除选中高亮`
7. 确认只剩另一条高亮
8. 再执行 `删除当前视图高亮`
9. 最后确认：
   - 高亮清空
   - 笔记仍然保留

这说明 desktop 真正锁住了两层删除契约：

- selection delete
- visible delete

## 这刀没做什么

这次没有补：

- EPUB / FB2 / Kindle-family 的 multi-select regression
- 反选
- 跨章节保留选中集
- selection persistence
- export / archive

所以它只是：

- 第一版高亮多选删除路径

不是完整的 selection management。

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
