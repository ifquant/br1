# 0648 Align Library Smoke Tests With Current Reader UI

## 背景

Reader 和 library UI 已经从旧的 sidebar-first 交互推进到 notebook overview/lane 结构。`tests/e2e/library-smoke.spec.ts` 里有几处断言还停在旧 UI：library shell 仍期待 `最近阅读` heading，notebook open button 使用了会命中两个控件的宽 selector，AI history tests 直接找 `最近求助`，没有先从 `本书 AI 记录摘要` 进入 `查找记录` lane。

## 主要目标

- 只修正 stale e2e expectations 和 selectors，不改变产品行为。
- 让 AI history tests 明确覆盖当前 overview -> lane -> current record 的交互路径。
- 保持 full Playwright suite 在默认并行配置下通过。

## 改动概览

- 更新 library shell smoke：移除已经不存在的 `最近阅读` heading 断言，使用当前的 `浏览选项` menu label，并把 EPUB metadata filter 断言对齐到当前 2 本命中。
- 将 notebook open selector 限定在 `工作台模式切换` 组内，避免和 collapsed rail 的同名 `打开笔记工作台` button 产生 strict-mode ambiguity。
- 新增本文件内的 lookup-lane helper：从 `本书 AI 记录摘要` 的 `查找记录` card 进入 `最近求助` lane，并在选择历史记录时等待 `当前正在查看的 AI 记录` 真正出现。

## 关键知识

- Playwright 的 role selector 会按 accessibility tree 查找，而不是按视觉位置查找。同一个 accessible name 同时出现在 mode toggle 和 collapsed rail 时，测试应该用最近的语义容器限定范围，而不是依赖 `.first()` 或宽 selector。
- 对 Svelte 条件渲染区域点击后马上查找新 DOM，容易遇到 detached click 或旧 section 尚未替换的问题。测试 helper 应该等待用户可见的 lane heading / active-record section，而不是等待内部状态或固定 timeout。

## 验证

- `pnpm exec playwright test --grep "library renders the reading-first shell in web mode|reader can open a notebook workspace without collapsing navigation|reader restores ai workspace history for the current book in web mode|reader keeps the active ai archive summary visible when the history list is collapsed|reader shows notebook-style action hierarchy inside ai archive lanes|reader can switch a focused ai lane between current-record and full-history views|reader shows breadcrumb and grouped browse controls inside focused ai lanes|reader can clear current-book ai history in web mode" --workers=1` PASS，8 passed。
- `pnpm test:e2e` PASS，50 passed。
- `pnpm check` PASS，0 errors and 0 warnings。
- `git diff --check` PASS。

## 未覆盖项

- 没有修改 app behavior、reader state model 或 notebook component implementation。
- 没有处理桌面 WebDriver/Tauri e2e；本次只覆盖 Playwright web-mode smoke suite。
