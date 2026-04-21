# 0334 - 增加可单独移除的书库筛选条件

上一轮已经把当前筛选条件显式展示出来，但用户仍然只能点 `清除筛选` 一次性重置所有条件。这轮给每个激活条件补一个可移除 chip，让用户可以只撤掉状态、搜索、归类或标签中的某一项。

## 改了什么

- `LibraryHeader` 新增 `activeFilterChips` 输入和 `clearfilterchip` 事件。
- library page 根据 search/status/collection/tag 派生可移除 chip。
- library page 统一处理单项清除：
  - `query` 清空搜索
  - `status` 回到 `全部`
  - `collection` 回到 `全部归类`
  - `tag` 回到 `全部标签`
- web smoke 覆盖移除 `状态 未开始` chip 后继续阅读书籍恢复。

## 为什么这样做

`清除筛选` 是兜底动作，但真实管理面需要更细的恢复粒度。用户经常只想撤掉一个条件，保留其他条件继续缩小书库范围。这里先用简单 chip 事件实现，不改变现有筛选状态模型。

## 验证

- `pnpm check`
- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts -g "library renders the reading-first shell in web mode"`
- `git diff --check`

## 没有包含

- 没有做多选筛选。
- 没有做批量重命名或独立 collection/tag 管理页。
- 没有做 cover editing、在线目录或同步能力。
