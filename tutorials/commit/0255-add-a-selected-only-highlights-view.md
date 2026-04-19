# 0255: 给 highlights workspace 补第一条 selected-only 视图

这次没有继续补格式证据，也没有再扩新的删除动作，而是把当前已经存在的 selection set 变成了一个真正可进入的工作面：

- `已选高亮`

## 为什么这刀值得做

到 `0254` 为止，`highlights` workspace 已经具备：

- 排序
- 选中部分高亮
- 反选
- 删除选中
- 删除当前视图

但这些能力还有一个明显的问题：

- “选中”仍然只是删除前的中间状态

用户没法先把一组高亮挑出来，再只看这组高亮本身。  
这会让 selection management 依旧像“临时批处理开关”，而不是一个真正可浏览的管理层。

所以这刀的目标很直接：

- 让当前选中的高亮集合本身，成为一个单独可进入的视图

## 这次改了什么

文件：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte`
- `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`
- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`
- `/Users/dev/workspace2/hc_apps/br1/.planning/FEATURE-PARITY-AUDIT.md`

### 1. highlights filter 从两态升级成三态

原来 `highlightsFilter` 只有：

- `all`
- `chapter`

现在扩成：

- `all`
- `chapter`
- `selected`

这意味着 `highlightsByScope` 不再只会收成“全部高亮”或“当前章节高亮”，还可以收成：

- 当前 `selectedHighlightIds` 对应的那组高亮

### 2. UI 上新增 `已选高亮`

在 highlights workspace 的 filter chips 里，现在多了：

- `已选高亮`

它的行为是：

1. 如果当前没有选中的高亮，按钮禁用
2. 一旦有选中的高亮，就可以切进去
3. meta row 会改成：
   - `N 已选高亮`
4. 列表只显示当前选择集里的高亮卡片

这一步的意义在于：

- selection set 第一次从“内部状态”变成了“可见工作面”

### 3. bulk delete 会跟着 selected-only 视图收口

原来的 `删除当前视图高亮` 只会区分：

- 全部视图
- 当前章节

现在它也会识别：

- `selected`

所以在 selected-only 模式下，它的文案和确认语义都会变成：

- `删除当前已选高亮`
- `删除当前已选高亮视图中的全部高亮？`

也就是说：

- current-view bulk action 现在正式能消费 selected subset

而不是只消费 chapter/all 这种大范围过滤。

## 为什么这刀先只锁 TXT web + EPUB desktop

这次没有把所有 desktop format 一起补齐，是有意控制范围。

我先锁两条最值钱的路径：

- `TXT` web smoke
- `EPUB` desktop 主路径

原因很直接：

- `TXT` 最稳定，适合证明 selected-only 视图本身不是空按钮
- `EPUB` 是主 reader surface，适合证明这不是 plain-text 特例

这样这刀先证明的是：

- selected-only view 这个产品面已经真实存在

而不是再继续铺一轮 secondary-format 证据。

## 测试里具体验证了什么

### TXT web smoke

现在 TXT web smoke 会：

1. 先做 `2 高亮 + 1 笔记`
2. 在 `高亮` tab 里按 `最早添加` 选中第一条
3. 切到 `已选高亮`
4. 确认：
   - meta row 变成 `1 已选高亮`
   - 列表只剩那一条被选中的高亮
5. 再切回 `全部`
6. 确认两条高亮重新出现

这样 selected-only view 就不只是存在，而是有真正的进出路径。

### EPUB desktop regression

现有的 EPUB desktop annotation regression 现在也会：

1. 选中第一条高亮
2. 切到 `已选高亮`
3. 确认只剩那一条最早高亮
4. 再回到 `全部`
5. 确认两条高亮重新出现
6. 后续再继续走 `反选 -> 删除选中 -> 删除当前视图`

这保证了 selected-only view 不是把后续管理动作打断掉，而是和现有 selection-management 链条能组合起来工作。

## 审计表同步了什么

`FEATURE-PARITY-AUDIT.md` 这次只补了一件事：

- `Annotations and Highlighting` 现在明确写入：
  - 已经有第一条 `selected-only highlights view`
  - 当前证据范围是：
    - `web TXT`
    - `desktop EPUB`

这样功能总账就不会继续把 selection management 只写成：

- 选中
- 反选
- 删除

而会反映出：

- “已选集合本身”已经成为一个真实的可浏览工作面

## 这刀没做什么

这次没有补：

- `FB2 / MOBI / AZW3` 的 selected-only desktop evidence
- selected-only 视图下的独立排序契约
- 跨章节选择集持久化
- export / archive

所以它只是：

- 给 highlights workspace 补第一条 selected-only 视图
- 并先用 `TXT web + EPUB desktop` 把它锁住

不是 secondary-format 全量收口。

## 验证

本次实际运行：

```bash
pnpm exec playwright test tests/e2e/library-smoke.spec.ts --reporter=line
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'persists epub highlights and notes separately through the desktop reader store' --mochaOpts.timeout 180000"
pnpm check
git diff --check
```

结果：

- `PASS`
- `PASS`
- `PASS`
- `PASS`
