# 0654 Add Reader Annotation Popup

## 背景

Task 6 要把正文选区从“只能去笔记工作台里找动作”推进到更像成熟阅读器的直接交互，但这一步不能把 popup 做成第二套标注状态。真正的高亮、笔记、查找、翻译和朗读动作仍然必须留在 `+page.svelte` 里，通过现有 route-owned selection 和 controller 回调执行。

## 这次改了什么

- 新增 `src/lib/components/reader/ReaderAnnotationPopup.svelte`，提供 `选中文本操作` toolbar、选区摘要、支持状态文案，以及高亮、笔记、查找、翻译、朗读、复制这些动作入口。
- 让 `ReaderStage.svelte` 成为 popup 的展示宿主：它只负责 popup 的可见性和位置，不接管真实的 annotation/assistance/TTS side effect。
- 保留 `ReaderViewport.svelte` 的保守定位策略，并补充注释说明为什么 TXT 可以贴近真实 DOM range，而 Foliate/其他 surface 需要退回到底部稳定位置。
- 在 `src/routes/reader/+page.svelte` 里继续让 selection action 走现有 route callbacks，同时把 PDF/CBZ 从“看起来可批注”收紧成 copy-only popup，避免假装已经有稳定写回能力。
- 更新 `tests/e2e/library-smoke.spec.ts`，用 TXT fixture 和 `.plain-text-reader` 的 DOM range 选区来锁定 popup 的基本可见性。

## 关键边界

- popup 只是 presentation layer。真正的 note/highlight/lookup/translation/TTS/copy ownership 仍在 route，不在 stage 或 viewport 里新建 store。
- TXT 选区和 Svelte reader shell 共享同一份 DOM，所以允许贴近选区定位；Foliate/EPUB 跨 iframe 的坐标在这一刀里不假装精确，直接退回到底部稳定浮层。
- PDF/CBZ 当前只给复制，不显示假动作。这样 UI 不会暗示“已经支持可靠批注定位”，而 route 里的 notes selection 也不会误吃这些格式的临时选区。

## 验证

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` PASS。
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 exec playwright test tests/e2e/library-smoke.spec.ts --workers=1 --grep "reader shows selection-near annotation actions in web mode"` PASS。
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` PASS。

## 未覆盖项

- 还没有做 footnote/link preview popup；那是 Task 7 的独立 slice。
- 还没有把 Foliate/EPUB 选区升级成真正的 cross-iframe near-selection 几何定位。
- 还没有给 popup 增加复制成功/失败提示或更细的 keyboard navigation polish。
