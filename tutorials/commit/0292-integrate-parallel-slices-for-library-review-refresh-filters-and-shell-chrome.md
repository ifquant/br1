# 0292: integrate parallel slices for library review, refresh filters, and shell chrome

这次提交不是再开一条新产品线，而是把上一轮并发 subagent 的三条 runtime patch 收成一刀可验证的主线集成。

收口目标很明确：

- `Library Management` 不再把所有 broken record 都塞进同一种 repair button
- `Annotations and Highlighting` 不再只给 cross-book refresh 一个总数提示
- `Customize Font and Layout` 不再只改正文，而是把 shell chrome 也接进统一 palette contract

这是一刀标准的 orchestrator 集成提交：

- subagent 改 runtime
- orchestrator 补回归
- 然后把账本和教程一起收口

## 这次实际集成了什么

### 1. library recovery queue 现在有显式的 manual-review relink surface

更新：

- `/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/ContinueReadingShelf.svelte`

上一刀已经把 `待修复书籍` queue 和 `批量修复副本` 做出来了，但 queue 里其实一直混着两类条目：

- 只缺 library copy，可以自动修
- 原路径已经失效，只能逐本人工复核

这次把第二类显式抬出来了。

现在 manual-only 条目会直接显示：

- `待复核`
- `复核并重关联`

并且点 row action 时，不再直接跳到 picker，而是先展开 detail panel，明确告诉你：

- 这本书为什么不能批量修
- 后面会沿用原位修复语义
- 真正的下一步动作是 `选择替换文件并重关联`

这一步值钱的地方不是按钮文案，而是 recovery queue 终于开始区分：

- `repairable`
- `review-first`

它不再把所有 broken local record 都伪装成“再点一次修复副本就行”。

### 2. cross-book refresh 结果现在有可筛选的 saved-set surface

更新：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte`

之前 `刷新映射 / 刷新全部跨书映射` 已经有了 structured summary，但 summary 还是偏“告诉你发生了什么”，不是“让你继续操作什么”。

这次把 summary 往真正的管理面推了一步：

- 新增 `全部已保存 / 完全匹配 / 部分匹配 / 未匹配` filter chips
- imported saved set card 上直接显示 outcome badge
- filter 命中为空时，给出 filter-specific empty state

结果就是：

- 不用再逐卡猜这次 refresh 哪些集合全命中
- 也不用只看顶部 notice 自己脑补哪些是 miss

这一步让 cross-book refresh 从“有结果反馈”变成“结果本身可以被继续管理”。

### 3. reader settings 现在开始真正影响 shell chrome

更新：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/settings.ts`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/index.ts`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderStage.svelte`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderHeaderBar.svelte`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte`

前面几刀已经把 settings model 做出来了，但很多设置影响的还是正文和 page shell；header / viewport chrome 这层还没有真正变成 shared contract。

这次补的是：

- `ReaderShellPalette`
- `getReaderShellPalette(themePreset)`
- stage root 上统一下发 shell CSS variables
- header 和 viewport 开始消费这些 vars

所以这刀不是“又加了一个颜色配置对象”，而是让 shell-level styling 开始和正文 settings 使用同一套 palette contract。

它的结果是：

- header chrome
- viewport frame
- plain-text / foliate shell

开始往同一套 theme language 靠，而不是继续各自写死。

## Orchestrator 补了什么证据

### web smoke

更新：

- `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`

补了两类证据：

1. `EPUB` layout settings reload smoke
   - 继续验证 flow/font/size/line-height/margins
   - 现在还会验证 stage-level shell palette token 存在
   - header / viewport border chrome 在 reload 后仍然不是透明空壳

2. `TXT` notes + saved-set long flow
   - cross-book refresh 后不只看 summary
   - 还会切到 `部分匹配 / 完全匹配 / 全部已保存`
   - 证明 refresh outcome filter 真能驱动 saved-set workspace

### desktop focused regression

更新：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

继续扩的是已有 case：

- `bulk repairs eligible broken library copies while leaving manual relink items in the repair queue`

这条 desktop case 现在不只验证 bulk repair 本身，还会先确认：

- manual-only 条目进入 `待修复书籍`
- row action 明确显示 `复核并重关联`
- 点击后会先展开 review panel
- panel 里明确出现：
  - `这本书当前只能逐本复核后再选替换文件`
  - `选择替换文件并重关联`

这让 `manual review first` 不再只是静态文案，而是有真实 desktop workflow evidence。

## 为什么这次集成方式是对的

因为这三条改动虽然属于不同 lane，但它们有一个共同点：

- 都是在把 `Partial` 功能从“存在一段逻辑”推进成“存在一个可管理的 surface”

具体来说：

- library recovery：从 repair action 变成 review-first workflow
- cross-book refresh：从 summary 变成 filterable result surface
- reader settings：从正文参数变成 shell chrome contract

这比继续补平级证据更值钱，因为它们都在提高产品面的清晰度，而不是只增加更多回归覆盖。

## 还没做什么

这次仍然没有做：

- library relink conflict resolution 的更深层交互
- saved-set refresh result 的持久化 filter state
- standalone sidebar sibling 完整接入 shell palette

也就是说，这刀已经把 surface 做出来了，但还没有把每一条都推到 fully closed。

## 你可以学到什么

### 1. 并发 patch 的正确集成方式，不是把 diff 直接叠上去

subagent 并发真正难的部分从来不是“让三个人各写一块”，而是：

- 哪些变化只是 runtime patch
- 哪些变化必须由 orchestrator 补 product evidence

这次如果只合并 subagent diff，不补 smoke / webdriver / audit / tutorial，那么主线历史会缺一整层“为什么这刀成立”的解释。

### 2. 很多 `Partial -> 强 Partial` 的推进，本质上是在做 management surface

这次三条线看起来分散，其实都在做同一件事：

- 让状态不再只存在于内部逻辑里
- 而是变成可以被用户看见、筛选、复核、继续处理的 surface

这是 `P0 closeout` 里最值钱的工作，因为它比“再多一个按钮”更接近真正的产品闭环。

## 验证

实际跑过：

```bash
pnpm check
pnpm exec playwright test tests/e2e/library-smoke.spec.ts --grep "reader persists epub layout settings through reload in web mode|reader supports txt notes through selection, persistence, and note reopen in web mode" --reporter=line
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'bulk repairs eligible broken library copies while leaving manual relink items in the repair queue' --mochaOpts.timeout 240000"
git diff --check
```

结果：

- PASS
