# 0328 - 增加一键清除书库筛选

现在 library header 已经支持状态、collection、tag、搜索和命中数。这个能力组合起来之后，用户也需要一个明确的逃生口：一次回到完整书库视图，而不是逐个点回 `全部 / 全部归类 / 全部标签` 再手动清空搜索。

## 改了什么

- `LibraryHeader` 新增 `clearfilters` 事件。
- 有 `filterSummary` 时显示 `清除筛选` 按钮。
- library page 收到事件后同时重置：
  - search query
  - reading status filter
  - collection filter
  - tag filter
- web smoke 覆盖 tag filter 后点击 `Clear library filters`，确认命中摘要消失且继续阅读项恢复。

## 为什么这样做

这不是单纯按钮增加。多个筛选维度叠加后，如果没有统一 reset，用户很容易误以为书库丢书或搜索坏了。`清除筛选` 把当前视图状态显式收口成一个可恢复动作，符合本轮 P0 的 library 管理面目标。

## 验证

- `pnpm check`
- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts -g "library renders the reading-first shell in web mode"`
- `bash scripts/automation/test-tauri-webdriver.sh pnpm exec wdio run wdio.conf.ts --mochaOpts.grep "edits shelf metadata"`
- `git diff --check`

## 没有包含

- 没有做筛选 chips 的布局重设计。
- 没有做多选 tag/collection。
- 没有做 cover editing、在线目录或同步能力。
