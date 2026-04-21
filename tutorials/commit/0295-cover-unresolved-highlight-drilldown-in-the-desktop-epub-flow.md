# 0295: cover unresolved highlight drilldown in the desktop EPUB flow

上一刀把 imported saved set 的 `未映射片段` 做了出来，但证据只在 `TXT web` 长流程里。

这次不扩功能，只把同一条 unresolved drilldown 拉进真实 `EPUB desktop` reader-window 路径。

## 这次实际改了什么

更新：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

`persists epub highlights and notes separately through the desktop reader store` 里本来已经有完整的 saved-set path：

- 保存选择集
- 重命名
- 排序
- reopen
- 导出
- 导入
- refresh single cross-book mapping
- bulk refresh cross-book mappings
- cross-book preview
- matched subset import
- duplicate import update-in-place

这次只补一个关键证据：

- imported payload 里加入一条永远无法映射的 foreign highlight snapshot
- bulk refresh 后断言 imported saved set card 显示：
  - `未命中 1 条，可刷新映射`
  - `未映射片段`
  - `missing desktop epub passage for unresolved drilldown`

这样 unresolved drilldown 不再只是 web smoke 上的 UI 证据，而是进入了真实 desktop EPUB reader store / reader window / saved-set refresh 链路。

## 为什么这刀很窄

这次没有改：

- `ReaderSidebar.svelte`
- saved-set schema
- import/export contract
- cross-book matching 规则

因为上一刀 runtime 已经足够。

这里缺的是主格式 desktop 证据，而不是新产品能力。

## 为什么要补 EPUB 而不是继续补更多格式

`EPUB` 是当前主阅读路径。

如果 imported saved-set unresolved drilldown 只在 `TXT web` 里有证据，那它还像是一个 smoke-only UI feature。

把它放进 `EPUB desktop` 后，证据链更接近 Readest parity 的核心判断：

- reflowable reader
- desktop store
- real reader window
- saved-set cross-book refresh
- unresolved failure surface

这些都在同一条 regression 里跑通。

## 还没做什么

这次仍然没有补：

- `FB2/MOBI/AZW3` 的 unresolved drilldown desktop 证据
- per-highlight manual remap
- unresolved ledger 的导出/复制

这些可以继续排，但不应该塞进这刀。

## 验证

实际跑过：

```bash
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'persists epub highlights and notes separately through the desktop reader store' --mochaOpts.timeout 240000"
```

结果：

- PASS
