# 0655 Add Reader Footnote Popup

## 背景

Task 7 要补上 Task 6 留下的脚注空缺，但这一刀不能让 popup 接管 reader route 的导航或持久化责任。`ReaderViewport.svelte` 仍然是 Foliate 事件和书籍文档解析的边界，`ReaderStage.svelte` 只负责把结果展示成稳定的 reader popup。

## 这次改了什么

- 新增 `src/lib/components/reader/ReaderFootnotePopup.svelte`，提供 `脚注预览` dialog、`关闭脚注` 操作，以及保守的 `跳转到正文位置` fallback 按钮。
- 让 `ReaderViewport.svelte` 继续承担 footnote interception/extraction：它只在识别出脚注型内部链接时发出 `footnoterequest`，并把 label、href、excerpt html/text、fallback navigation target 一起交给 stage。
- 让 `ReaderStage.svelte` 成为 popup 的展示宿主，并继续通过现有 `controlrequest` 的 `href` 分支执行跳转，避免把 popup 变成第二套 reader navigation owner。
- 新增 `static/samples/sample-footnote.epub` 作为本地 smoke fixture，并在 `tests/e2e/library-smoke.spec.ts` 里锁定 `reader opens footnote links in a reader popup in web mode`。

## 关键边界

- 脚注 link interception/extraction 属于 viewport，因为这里只有它既能拿到 renderer 文档，也知道当前 internal href 应该如何退回正文位置。
- popup presentation 属于 stage，因为这里已经是现成的 reader overlay/popup 宿主；route 不需要再额外持有“popup 是否展开”这类纯展示状态。
- fallback jump 仍走既有 `controlrequest -> href` 路径，所以脚注 popup 没有偷偷接管真实导航。
- excerpt HTML 会先经过本地 allowlist 清洗，避免把书内任意标记直接原样塞进 stage DOM。

## 验证

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` PASS。
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader opens footnote links in a reader popup in web mode"` PASS。
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` PASS。

## 未覆盖项

- 这一刀没有引入更激进的 near-link geometry；popup 仍然走 stage 内稳定位置，而不是声称跨 iframe 坐标准确。
- 还没有把 popup 做成多层 footnote history/back stack。
- 还没有为 ordinary chapter links、glossary links、或 external links 设计不同的 popup copy。
