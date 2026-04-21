# 0327 - 显示书库筛选命中数

这次继续收 `Library Management` 的本地工作面。前几轮已经有状态筛选、collection 筛选和 tag 筛选，但多个筛选叠加后，用户只能通过目测卡片数量判断当前视图是否合理。现在 header 会在筛选或搜索启用时显示 `筛选命中 X / Y 本`。

## 改了什么

- `LibraryHeader` 新增 `filterSummary` 展示位。
- library page 根据当前运行模式计算命中数：
  - desktop 模式使用真实导入书库的 filtered workflow sections。
  - web/sample 模式使用样例书库的 filtered workflow sections。
- filter summary 只在搜索、状态筛选、collection filter 或 tag filter 任一条件启用时出现。
- web smoke 覆盖 collection filter 的 `2 / 5` 和 tag filter 的 `1 / 5` 命中反馈。

## 为什么这样做

这不是视觉 polish，而是管理面语义。随着状态、归类、标签叠加，书库必须清楚告诉用户当前看到的是完整书库还是一个筛选视图。否则空状态、少量命中和误筛选会很难区分。

## 验证

- `pnpm check`
- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts -g "library renders the reading-first shell in web mode"`
- `bash scripts/automation/test-tauri-webdriver.sh pnpm exec wdio run wdio.conf.ts --mochaOpts.grep "edits shelf metadata"`
- `git diff --check`

## 没有包含

- 没有做一键清除所有筛选。
- 没有做筛选条件 chips 的重排或折叠。
- 没有做 cover editing、在线目录或同步能力。
