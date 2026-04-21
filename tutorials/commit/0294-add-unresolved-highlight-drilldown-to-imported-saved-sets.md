# 0294: add unresolved highlight drilldown to imported saved sets

这次提交只推进 `Annotations and Highlighting` 的一个短板：跨书 saved-set refresh 之后，用户不能只看到“未命中 1 条”，还要能看到到底是哪段正文没有映射回来。

这是一刀小切片，但很贴近 `P0 closeout`：

- 不改 import/export schema
- 不改 cross-book import 规则
- 只把已经持久化的 foreign highlight snapshots 用起来

## 这次实际补了什么

### 1. imported saved set card 现在显示未映射正文样本

更新：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte`

之前 imported saved set card 已经能显示：

- `部分匹配`
- `未命中 1 条，可刷新映射`

但这仍然只是计数。

这次新增了：

- `未映射片段`
- 最多 3 条 unresolved text samples

实现上没有新增持久化字段。

原因是 imported saved set 的 `importSource.highlights` 本来就保存了来源书的 highlight snapshots。现在 sidebar 会用这批 snapshots 重新跑现有 locator/text-anchor resolution，然后把仍然无法命中的正文片段列出来。

这让用户从：

- “这组有 1 条没命中”

前进到：

- “具体是这段文字没命中”

### 2. 这条 drilldown 会跟随 reload 恢复

更新：

- `/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts`

TXT web smoke 现在故意构造一个 imported saved set：

- 一条可以映射
- 一条 foreign snapshot 永远无法映射

然后验证：

1. card 显示 `未命中 1 条，可刷新映射`
2. card 显示 `未映射片段`
3. card 显示那条具体 missing text
4. reload 后仍然停在 `部分匹配` filter
5. missing text 仍然可见

这证明它不是临时 notice，而是和 per-book saved-set workspace state 一起恢复。

## 为什么这次切片合理

上一刀已经把 saved-set refresh filter 做成了可持久化 review lens。

下一步不该马上做更大的 cross-book remap 规则，而是先回答一个更基本的问题：

- 如果某组是 `部分匹配`，用户怎么知道问题出在哪？

这次就是最小答案。

它还没有提供“逐条修复”动作，但已经把 unresolved state 从 count 变成了具体 ledger。

## 还没做什么

这次仍然没有做：

- 对每条 unresolved highlight 的手动重新映射
- 导出 unresolved report
- 更多 than 3 条的展开/折叠
- desktop EPUB 侧同等级 drilldown 回归

这些都可以继续做，但不应该塞进这刀。

## 你可以学到什么

### 不要急着扩 schema

这次最重要的选择是：

- 先复用 `importSource.highlights`

而不是急着加一个新的 `unmatchedHighlights` 持久化字段。

只要来源 snapshots 已经足够重建 unresolved list，就应该先让 UI 从现有 contract 中派生结果。这样 schema 更稳，后面真正需要 manual remap 时再扩字段。

## 验证

实际跑过：

```bash
pnpm check
pnpm exec playwright test tests/e2e/library-smoke.spec.ts --grep "reader supports txt notes through selection, persistence, and note reopen in web mode" --reporter=line
```

结果：

- PASS
