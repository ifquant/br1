# 0329 - 增加元数据面板快捷筛选

书库 header 已经可以按归类和标签筛选，但书籍详情里的 `书架归类` 和 `标签` 还只是静态文本。现在用户在复核一本书的元数据时，可以直接从详情面板进入对应筛选视图。

## 改了什么

- `BookshelfPreview` 新增 `onFilterCollection` 和 `onFilterTag` 可选回调。
- metadata panel 里的归类和标签在有回调时渲染为可点击按钮。
- library page 把这些按钮接到现有筛选状态，并在快捷筛选时清空搜索、状态筛选和另一类归类/tag 筛选，避免叠加条件造成误判。
- web smoke 覆盖从 `A Theory of Justice` 的详情面板直接筛选 `政治哲学` 归类和 `正义论` 标签，再用 `Clear library filters` 回到完整书库。

## 为什么这样做

这一步把本地 collection/tag 从“可编辑字段”推进成“可管理对象”。用户不需要先记住某本书的归类或标签，再去 header 里找对应按钮；在书籍详情里看到元数据后可以直接切到同类书籍视图。

## 验证

- `pnpm check`
- `pnpm exec playwright test tests/e2e/library-smoke.spec.ts -g "library renders the reading-first shell in web mode"`
- `bash scripts/automation/test-tauri-webdriver.sh pnpm exec wdio run wdio.conf.ts --mochaOpts.grep "edits shelf metadata"`
- `git diff --check`

## 没有包含

- 没有做多选 collection/tag。
- 没有做完整 collections/tags 管理页。
- 没有做 cover editing、在线目录或同步能力。
